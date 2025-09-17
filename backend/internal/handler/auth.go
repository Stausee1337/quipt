package handler

import (
	"errors"
	"io"
	"log/slog"
	"net/http"

	"github.com/stausee1337/quipt/internal/service"
	"github.com/stausee1337/quipt/protos"
	"google.golang.org/protobuf/proto"
)

type SignupHandler struct {
	user *service.UserService
	auth *service.AuthService
}

func NewSignupHandler(user *service.UserService, auth *service.AuthService) *SignupHandler {
	return &SignupHandler { user, auth };
}

func (h *SignupHandler) HandleSignup(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body);
	if err != nil {
		logFatalAndReport(w, err)
		return
	}
	defer r.Body.Close()

	var req protos.SignupRequest
	if err = proto.Unmarshal(body, &req); err != nil {
		slog.Error(err.Error());
		w.WriteHeader(http.StatusBadRequest);
		return;
	}

	ctx := r.Context()

	var response []byte

	user, err := h.user.Signup(ctx, req.Username, req.Password, nil, false)
	if err != nil {
		auth, ok := err.(*service.AuthError);
		if !ok {
			logFatalAndReport(w, err)
			return
		}
		response, err = proto.Marshal(&protos.AuthError {
			Code: auth.Code,
			Message: auth.Message,
		});
		if err != nil {
			logFatalAndReport(w, err)
			return
		}
		w.WriteHeader(http.StatusBadRequest);
	} else {
		auth, err := h.auth.SigninUserAtClient(ctx, user);
		if err != nil {
			logFatalAndReport(w, err)
			return
		}

		response, err = proto.Marshal(auth);
		if err != nil {
			logFatalAndReport(w, err)
			return
		}
	}

	w.Write(response)
}

func (h* SignupHandler) HandleSignin(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body);
	if err != nil {
		logFatalAndReport(w, err)
		return
	}
	defer r.Body.Close()

	var req protos.SigninRequest
	if err = proto.Unmarshal(body, &req); err != nil {
		slog.Error(err.Error());
		w.WriteHeader(http.StatusBadRequest);
		return;
	}

	ctx := r.Context()

	var response []byte

	user, err := h.user.Signin(ctx, req.Username, req.Password)
	if err != nil {
		auth, ok := err.(*service.AuthError);
		if !ok {
			logFatalAndReport(w, err)
			return
		}
		response, err = proto.Marshal(&protos.AuthError {
			Code: auth.Code,
			Message: auth.Message,
		});
		if err != nil {
			logFatalAndReport(w, err)
			return
		}
		w.WriteHeader(http.StatusBadRequest);
	} else {
		auth, err := h.auth.SigninUserAtClient(ctx, user);
		if err != nil {
			logFatalAndReport(w, err)
			return
		}

		response, err = proto.Marshal(auth);
		if err != nil {
			logFatalAndReport(w, err)
			return
		}
	}

	w.Write(response)
}

func (h *SignupHandler) HandleRefresh(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body);
	if err != nil {
		logFatalAndReport(w, err)
		return
	}
	defer r.Body.Close()

	refreshToken := string(body)
	auth, err := h.auth.RefreshLogin(r.Context(), refreshToken);
	if err != nil {
		if errors.Is(err, service.ErrInvalidToken) {
			http.Error(w, "invalid refresh token", http.StatusBadRequest)
			return
		}
		logFatalAndReport(w, err)
		return
	}

	data, err := proto.Marshal(auth)
	if err != nil {
		logFatalAndReport(w, err)
		return
	}

	w.Write(data)

	// claims := h.auth.GetLoggedInUser(r)
	// if claims == nil {
	// 	http.Error(w, "unauthorized", http.StatusUnauthorized)
	// 	return
	// }
	// claims.Uuid
}

func (h *SignupHandler) HandleExpire(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body);
	if err != nil {
		logFatalAndReport(w, err)
		return
	}
	defer r.Body.Close()

	refreshToken := string(body)

	err = h.auth.SignoutUserFromClient(r.Context(), refreshToken)
	if err != nil {
		slog.Error(err.Error())
	}

	w.WriteHeader(http.StatusNoContent);
}
