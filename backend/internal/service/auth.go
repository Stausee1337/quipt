package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stausee1337/quipt/internal/qmodel"
	"github.com/stausee1337/quipt/pkg/config"
	"golang.org/x/crypto/bcrypt"
)

type UserClaims struct {
	Uuid uuid.UUID
	jwt.RegisteredClaims
}

type signedToken struct {
	signed 	string
	expires int64
}

const userCtxKey = "user";

type AuthService struct {
	cfg *config.Config
	db 	*redis.Client
}

func NewAuthService(cfg *config.Config, db *redis.Client) *AuthService {
	return &AuthService { cfg, db };
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

func (t* refreshToken) commit(ctx context.Context, db *redis.Client) error {
	hashed_secret, err := bcrypt.GenerateFromPassword([]byte(t.secret), bcrypt.DefaultCost);
	if err != nil {
		return fmt.Errorf("could not hash secret refresh token: %w", err)
	}

	fmt.Printf("commit: %v\n", string(hashed_secret))

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

func (s *AuthService) SigninUserAtClient(ctx context.Context, user *qmodel.User) (*qmodel.AuthSuccess, error) {
	accessToken, err := s.createAccessToken(user.Uuid);
	if err != nil {
		return nil, err
	}
	refreshToken, err := newRefreshToken(user.Uuid)
	if err != nil {
		return nil, err
	}
	err = refreshToken.commit(ctx, s.db)
	if err != nil {
		return nil, err
	}

	return &qmodel.AuthSuccess {
		UserId: user.Uuid,
		AccessToken: accessToken.signed,
		RefreshToken: refreshToken.string(),
		ExpiresAt: float64(accessToken.expires),
	}, nil
}

func (s* AuthService) SignoutUserFromClient(ctx context.Context, refreshToken string) error {
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

func (s *AuthService) GetLoggedInUser(r *http.Request) *UserClaims {
	claims, ok := r.Context().Value(userCtxKey).(*UserClaims)
	if !ok {
		return nil;
	}
	return claims
}

var ErrInvalidToken = errors.New("invalid refresh token")

func (s *AuthService) RefreshLogin(ctx context.Context, refreshToken string) (*qmodel.AuthSuccess, error) {
	splits := strings.SplitN(refreshToken, ".", 2)
	if len(splits) < 2 {
		return nil, ErrInvalidToken
	}
	id, secret := splits[0], splits[1]

	rawData, err := s.db.Get(ctx, id).Result()
	if err == redis.Nil {
		return nil, ErrInvalidToken
	} else if err != nil {
		return nil, fmt.Errorf("could not lookup refresh token: %w", err)
	}

	fmt.Printf("%q\n", rawData)

	var data refreshTokenSavedData
	err = json.Unmarshal([]byte(rawData), &data)
	if err != nil {
		return nil, fmt.Errorf("could not json decode for refresh token %q: %w", id, err)
	}
	fmt.Printf("refresh: %v\n", data.Secret)

	err = bcrypt.CompareHashAndPassword([]byte(data.Secret), []byte(secret));
	if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		return nil, ErrInvalidToken
	} else if err != nil {
		return nil, err
	}

	accessToken, err := s.createAccessToken(data.Uuid)
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

func (s *AuthService) createAccessToken(uuid uuid.UUID) (*signedToken, error) {
	claims := UserClaims{
		Uuid: uuid,
	}
	expires := time.Now().Add(15 * time.Minute)
	claims.ExpiresAt = jwt.NewNumericDate(expires)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.cfg.AuthSecret))
	if err != nil {
		return nil, fmt.Errorf("could not sign token %q: %w", uuid, err);
	}
	return &signedToken {
		signed: signed,
		expires: expires.UnixMilli(),
	}, nil
}


