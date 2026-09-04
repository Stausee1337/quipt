package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stausee1337/quipt/internal/qmodel"
	"github.com/stausee1337/quipt/internal/repository"
	"github.com/stausee1337/quipt/pkg/config"
	"golang.org/x/crypto/bcrypt"
)

type UserClaims struct {
	Uuid uuid.UUID
	jwt.RegisteredClaims
}

type AuthService struct {
	cfg  *config.Config
	db 	 *redis.Client
	user *UserService
}

func NewAuthService(cfg *config.Config, db *redis.Client, user *UserService) *AuthService {
	return &AuthService { cfg, db, user };
}

func (s *AuthService) VerifyToken(ctx context.Context, tokenStr string) context.Context {
	var claims UserClaims
	token, error := jwt.ParseWithClaims(tokenStr, &claims, func(t *jwt.Token) (any, error) {
		return []byte(s.cfg.AuthSecret), nil
	});

	if error != nil || !token.Valid {
		return ctx
	}
	return context.WithValue(ctx, userCtxKey, &claims)
}

func (s *AuthService) GetLoggedInUser(ctx context.Context) *UserClaims {
	claims, ok := ctx.Value(userCtxKey).(*UserClaims)
	if !ok {
		return nil;
	}
	return claims
}

func (s *AuthService) Signin(
	ctx context.Context,
	username string,
	password string,
) (*qmodel.AuthSuccess, error) {
	passwordBytes := []byte(password)
	if len(passwordBytes) > 72 {
		// truncate for bcrypt
		passwordBytes = passwordBytes[:72]
	}

	user, err := s.user.GetByUsername(ctx, username)
	if errors.Is(err, repository.ErrUnknownUser) {
		// compare hash and password here anyways, to not have a difference
		// in response time between username and password invalid	
		bcrypt.CompareHashAndPassword([]byte("hello, world"), passwordBytes)
		return nil, AuthError(qmodel.AuthErrorINVALIDCREDENTIALS);
	} else if err != nil {
		return nil, err
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.password), passwordBytes);
	if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		return nil, AuthError(qmodel.AuthErrorINVALIDCREDENTIALS);
	} else if err != nil {
		return nil, fmt.Errorf("could not hash password %q: %w", username, err);
	}

	return s.createLogin(ctx, user.Uuid)
}

func (s *AuthService) Signup(
	ctx context.Context,
	username string,
	password string,
	sub *string,
	verified bool,
) (*qmodel.AuthSuccess, error) {
	if len(username) < 3 {
		return nil, AuthError(qmodel.AuthErrorUSERNAMEMALFORMED);
	}

	if !simplePasswordCheck(password) {
		return nil, AuthError(qmodel.AuthErrorWEAKPASSWORD);
	}

	_, err := s.user.GetByUsername(ctx, username)
	if err == nil {
		return nil, AuthError(qmodel.AuthErrorUSERNAMEALREADYEXISTS);
	} else if !errors.Is(err, repository.ErrUnknownUser) {
		return nil, err;
	}

	hashedPassword, err := hashPassword(password);
	if err != nil {
		return nil, err;
	}

	user := &User {
		User: qmodel.User{
			Username: username,
			Verified: verified,
		},
		sub: sub,
		password: hashedPassword,
	};
	if err = s.user.CreateUser(ctx, user); err != nil {
		return nil, err;
	}

	return s.createLogin(ctx, user.Uuid)
}

func (s *AuthService) createLogin(ctx context.Context, userUuid uuid.UUID) (*qmodel.AuthSuccess, error) {
	accessToken, err := newAccessToken([]byte(s.cfg.AuthSecret), userUuid)
	if err != nil {
		return nil, err
	}

	refreshToken, err := newRefreshToken(userUuid)
	if err != nil {
		return nil, err
	}

	err = refreshToken.commit(ctx, s.db)
	if err != nil {
		return nil, err
	}

	return &qmodel.AuthSuccess {
		UserId: userUuid,
		AccessToken: accessToken.signed,
		RefreshToken: refreshToken.string(),
		ExpiresAt: float64(accessToken.expires),
	}, nil
}

func (s* AuthService) DeleteToken(ctx context.Context, refreshToken string) error {
	splits := strings.SplitN(refreshToken, ".", 2)
	if len(splits) < 2 {
		return nil
	}
	id := splits[0]

	err := s.db.Del(ctx, id).Err()
	if err == redis.Nil {
		return nil
	} else if err != nil {
		return fmt.Errorf("could not delete refresh token: %w", err)
	}

	return nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*qmodel.AuthSuccess, error) {
	splits := strings.SplitN(refreshToken, ".", 2)
	if len(splits) < 2 {
		return nil, ErrInvalidToken
	}
	id, secret := splits[0], splits[1]

	// NOTE: this relies on the assumption, that redis will not return expired entries.
	rawData, err := s.db.Get(ctx, id).Result()
	if err == redis.Nil {
		return nil, ErrInvalidToken
	} else if err != nil {
		return nil, fmt.Errorf("could not lookup refresh token: %w", err)
	}

	var data refreshTokenSavedData
	err = json.Unmarshal([]byte(rawData), &data)
	if err != nil {
		return nil, fmt.Errorf("could not json decode for refresh token %q: %w", id, err)
	}

	err = bcrypt.CompareHashAndPassword([]byte(data.Secret), []byte(secret));
	if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		return nil, ErrInvalidToken
	} else if err != nil {
		return nil, err
	}

	accessToken, err := newAccessToken([]byte(s.cfg.AuthSecret), data.Uuid)
	if err != nil {
		return nil, err
	}

	err = s.db.Del(ctx, id).Err()
	if err != nil {
		return nil, fmt.Errorf("could not delete prev refresh token %q: %w", id, err)
	}

	nextRefreshToken, err := newRefreshToken(data.Uuid)
	if err != nil {
		return nil, err
	}

	err = nextRefreshToken.commit(ctx, s.db)
	if err != nil {
		return nil, err
	}
	
	return &qmodel.AuthSuccess {
		UserId: data.Uuid,
		AccessToken: accessToken.signed,
		RefreshToken: nextRefreshToken.string(),
		ExpiresAt: float64(accessToken.expires),
	}, nil
}

type signedToken struct {
	signed 	string
	expires int64
}

var ErrInvalidToken = errors.New("invalid refresh token")

func newAccessToken(authSecret []byte, uuid uuid.UUID) (*signedToken, error) {
	claims := UserClaims{
		Uuid: uuid,
	}
	expires := time.Now().Add(15 * time.Minute)
	claims.ExpiresAt = jwt.NewNumericDate(expires)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(authSecret)
	if err != nil {
		return nil, fmt.Errorf("could not sign token %q: %w", uuid, err);
	}
	return &signedToken {
		signed: signed,
		expires: expires.UnixMilli(),
	}, nil
}

type refreshToken struct {
	id 		string
	uuid	uuid.UUID
	secret 	string
	expires	time.Duration
}

type refreshTokenSavedData struct {
	Uuid	uuid.UUID `json:"uuid"`
	Secret 	string	  `json:"secret"`
}

const REFRESH_TTL time.Duration = 30 * 24 * time.Hour

func newRefreshToken(userUuid uuid.UUID) (*refreshToken, error) {
	base64Encoding := base64.StdEncoding.WithPadding(base64.NoPadding)

	var tok refreshToken
	id, err := uuid.NewUUID()
	if err != nil {
		return nil, fmt.Errorf("could not generate id refresh token: %w", err)
	}
	tok.id = base64Encoding.EncodeToString(id[:])

    b := make([]byte, 32)
    if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return nil, fmt.Errorf("could not generate secret refresh token: %w", err)
    }
	tok.uuid = userUuid
    tok.secret = base64Encoding.EncodeToString(b)
	// lasts 30 days
	tok.expires = REFRESH_TTL

	return &tok, nil
}

func (t *refreshToken) string() string {
	return fmt.Sprintf("%v.%v", t.id, t.secret)
}

func (t *refreshToken) commit(ctx context.Context, db *redis.Client) error {
	hashed_secret, err := bcrypt.GenerateFromPassword([]byte(t.secret), bcrypt.DefaultCost);
	if err != nil {
		return fmt.Errorf("could not hash secret refresh token: %w", err)
	}

	bytes, err := json.Marshal(refreshTokenSavedData{
		Uuid: t.uuid,
		Secret: string(hashed_secret),
	})
	if err != nil {
		return fmt.Errorf("could not json encode refresh token: %w", err)
	}

	err = db.Set(
		ctx, t.id,
		bytes, t.expires,
	).Err();

	if err != nil {
		return fmt.Errorf("could not add refresh token into redis: %w", err)
	}
	return nil
}

func hashPassword(password string) ([]byte, error) {
	result, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost);
	if err != nil {
		return nil, fmt.Errorf("hashing password %q: %w", password, err);
	}
	return result, nil
}

const PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
const NUMERIC = "0123456789"
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

func containsAny(target string, needles string) bool {
	for i := 0; i < len(needles); i++ {
		if strings.ContainsRune(target, rune(needles[i])) {
			return true
		}
	}
	return false;

}

// TODO: a better check would be to run against a small list of common passwords
func simplePasswordCheck(password string) bool {
	if len(password) < 8 {
		return false;
	}
	if len(password) > 72 {
		// FIXME: we currently return `WEAK_PASSWORD` in the too long for bcrypt case
		return false;
	}
	if !containsAny(password, PUNCTUATION) {
		return false;
	}
	if !containsAny(password, NUMERIC) {
		return false;
	}
	if !containsAny(password, LOWERCASE) {
		return false;
	}
	if !containsAny(password, UPPERCASE) {
		return false;
	}
	return true;
}

