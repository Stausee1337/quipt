package handler

import (
	"context"
	"errors"
	"log/slog"

	"github.com/stausee1337/quipt/internal/service"
	"github.com/stausee1337/quipt/internal/qmodel"
)

type AuthMutationHandler struct {
	auth *service.AuthService
	user *service.UserService
}

func NewAuthHandler(auth *service.AuthService, user *service.UserService) *AuthMutationHandler {
	return &AuthMutationHandler{ auth, user }
}

type AuthResult = struct {
	Variant1 *qmodel.AuthSuccess `json:"variant1,omitempty"`
	Variant2 *qmodel.AuthError   `json:"variant2,omitempty"`
};

func (h *AuthMutationHandler) Signin(ctx context.Context, username string, password string) (*AuthResult, error) {
	user, err := h.user.Signin(ctx, username, password)

	if err != nil {
		auth, ok := err.(service.AuthError);
		if !ok {
			panic(err)
		}
		err := qmodel.AuthError(auth)
		return &AuthResult{ Variant2: &err }, nil
	}

	auth, err := h.auth.SigninUserAtClient(ctx, user);
	if err != nil {
		panic(err)
	}

	return &AuthResult{ Variant1: auth }, nil
}

func (h *AuthMutationHandler) Signup(ctx context.Context, username string, password string) (*AuthResult, error) {
	user, err := h.user.Signup(ctx, username, password, nil, false)

	if err != nil {
		auth, ok := err.(service.AuthError);
		if !ok {
			panic(err)
		}
		err := qmodel.AuthError(auth)
		return &AuthResult{ Variant2: &err }, nil
	}

	auth, err := h.auth.SigninUserAtClient(ctx, user);
	if err != nil {
		panic(err)
	}

	return &AuthResult{ Variant1: auth }, nil
}

func (h *AuthMutationHandler) Refresh(ctx context.Context, refreshToken string) (*qmodel.AuthSuccess, error) {
	auth, err := h.auth.RefreshToken(ctx, refreshToken)
	if err != nil {
		if errors.Is(err, service.ErrInvalidToken) {
			return nil, errors.New("invalid refresh token")
		}
		panic(err)
	}

	return auth, nil

}

func (h *AuthMutationHandler) Logout(ctx context.Context, refreshToken string) error {

	err := h.auth.SignoutUserFromClient(ctx, refreshToken)
	if err != nil {	
		slog.Error(err.Error())
	}

	return nil;
}

