package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stausee1337/quipt/pkg/config"
	"github.com/stausee1337/quipt/protos"
	"golang.org/x/crypto/bcrypt"
)

type UserClaims struct {
	Uuid string
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
		return s.cfg.AuthSecret, nil
	});

	if error != nil || !token.Valid {
		return ctx
	}
	return context.WithValue(ctx, userCtxKey, &claims)
}

type refreshToken struct {
	id 		string
	uuid	string
	secret 	string
	expires	time.Duration
}

func newRefreshToken(userUuid string) (*refreshToken, error) {
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
	tok.expires = 30 * 24 * time.Hour

	return &tok, nil
}

func (t *refreshToken) string() string {
	return fmt.Sprintf("%v.%v", t.id, t.secret)
}

func (t* refreshToken) data() ([]byte, error) {
	hashed_secret, err := bcrypt.GenerateFromPassword([]byte(t.secret), bcrypt.DefaultCost);
	if err != nil {
		return nil, fmt.Errorf("could not hash secret refresh token: %w", err)
	}

	bytes, err := json.Marshal(map[string]any{
		"uuid": t.uuid,
		"expires": t.expires,
		"secret": hashed_secret,
	})
	if err != nil {
		return nil, fmt.Errorf("could not json encode refresh token: %w", err)
	}
	return bytes, nil
}

func (s *AuthService) SigninUserAtClient(ctx context.Context, user *protos.User) (*protos.AuthSuccess, error) {
	accessToken, err := s.createAccessToken(user.Id);
	if err != nil {
		return nil, err
	}
	refreshToken, err := newRefreshToken(user.Id)
	if err != nil {
		return nil, err
	}
	data, err := refreshToken.data()
	if err != nil {
		return nil, err
	}
	err = s.db.Set(
		ctx,
		refreshToken.id,
		data,
		refreshToken.expires,
	).Err();

	if err != nil {
		return nil, fmt.Errorf("could not add refresh token into redis: %w", err)
	}

	return &protos.AuthSuccess {
		UserId: user.Id,
		AccessToken: accessToken.signed,
		RefreshToken: refreshToken.string(),
		ExpiresAt: accessToken.expires,
	}, nil
}

func (s *AuthService) createAccessToken(uuid string) (*signedToken, error) {
	claims := UserClaims {
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


