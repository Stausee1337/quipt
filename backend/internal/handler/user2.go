package handler

import (
	"context"

	"github.com/stausee1337/quipt/internal/qmodel"
	"github.com/stausee1337/quipt/internal/service"
)

type UserQueryHandler struct {
	user *service.UserService
	auth *service.AuthService
}

func NewUserHandler(user *service.UserService, auth *service.AuthService) *UserQueryHandler {
	return &UserQueryHandler{user, auth}
}

func (h *UserQueryHandler) Get(ctx context.Context) (*qmodel.User, error) {
	userUuid := LoggedInUser(ctx);
	user, err := h.user.GetUserById(ctx, userUuid)
	if err != nil {
		panic(err)
	}

	return user, nil
}

