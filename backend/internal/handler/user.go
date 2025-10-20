package handler

import (
	"context"

	"github.com/stausee1337/quipt/internal/qmodel"
	"github.com/stausee1337/quipt/internal/service"
)

type UserQueryHandler struct {
	user *service.UserService
}

func NewUserHandler(user *service.UserService) *UserQueryHandler {
	return &UserQueryHandler{user}
}

func (h *UserQueryHandler) Get(ctx context.Context) (*qmodel.User, error) {
	userUuid := LoggedInUser(ctx);
	user, err := h.user.GetById(ctx, userUuid)
	if err != nil {
		panic(err)
	}

	return user, nil
}

