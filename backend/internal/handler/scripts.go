package handler

import (
	"net/http"

	"github.com/stausee1337/quipt/internal/service"
	"github.com/stausee1337/quipt/protos"
	"google.golang.org/protobuf/proto"
)

type ScriptsHandler struct {
	auth 	*service.AuthService
	scripts *service.ScriptsService
}
	

func NewScriptsHanlder(
	auth *service.AuthService,
	scripts *service.ScriptsService,
) *ScriptsHandler {
	return &ScriptsHandler { auth, scripts };
}

func (h *ScriptsHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	claims := h.auth.GetLoggedInUser(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	scripts, err := h.scripts.GetAllScripts(r.Context(), claims.Uuid)
	if err != nil {
		logFatalAndReport(w, err)
		return
	}

	response, err := proto.Marshal(&protos.Scripts { Scripts: scripts });
	if err != nil {
		logFatalAndReport(w, err)
		return
	}

	w.Write(response)
}

