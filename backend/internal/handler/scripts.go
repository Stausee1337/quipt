package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
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

func (h *ScriptsHandler) HandleList(w http.ResponseWriter, r *http.Request) {
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

func (h *ScriptsHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	claims := h.auth.GetLoggedInUser(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	ctx := r.Context()

	scriptId := chi.URLParam(r, "ScriptID");

	script, err := h.scripts.GetScriptById(ctx, claims.Uuid, scriptId);
	var response []byte

	if err != nil {
		scriptErr, ok := err.(*service.ScriptError);
		if !ok {
			logFatalAndReport(w, err)
			return
		}
		response, err = proto.Marshal(&protos.ScriptError {
			Code: scriptErr.Code,
			Message: scriptErr.Message,
		});
		if err != nil {
			logFatalAndReport(w, err)
			return
		}
		w.WriteHeader(http.StatusBadRequest);
	} else {
		response, err = proto.Marshal(script);
		if err != nil {
			logFatalAndReport(w, err)
			return
		}
	}

	w.Write(response)
}

