package handler

import (
	"net/http"

	"google.golang.org/protobuf/proto"
	"github.com/stausee1337/quipt/internal/service"
)


type UserHandler struct {
	user *service.UserService
	auth *service.AuthService
}

func NewUserHandler(user *service.UserService, auth *service.AuthService) *UserHandler {
	return &UserHandler { user, auth };
}

func (h *UserHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	claims := h.auth.GetLoggedInUser(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := h.user.GetUserById(r.Context(), claims.Uuid)
	if err != nil {
		logFatalAndReport(w, err)
		return
	}

	response, err := proto.Marshal(user);
	if err != nil {
		logFatalAndReport(w, err)
		return
	}

	w.Write(response)
}
