package handler

import (
	"io"
	"log/slog"
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

	scripts, err := h.scripts.GetAllScripts(r.Context(), claims.Uuid.String())
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

	script, err := h.scripts.GetScriptById(ctx, claims.Uuid.String(), scriptId);
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

func (h *ScriptsHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	claims := h.auth.GetLoggedInUser(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	body, err := io.ReadAll(r.Body);
	if err != nil {
		logFatalAndReport(w, err)
		return
	}
	defer r.Body.Close()

	var req protos.DivisionScoreUpdate
	if err = proto.Unmarshal(body, &req); err != nil {
		slog.Error(err.Error());
		w.WriteHeader(http.StatusBadRequest);
		return;
	}

	ctx := r.Context()

	err = h.scripts.UpdateScriptDivisionScores(ctx, claims.Uuid.String(), &req)

	if err == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	} 

	scriptErr, ok := err.(*service.ScriptError);
	if !ok {
		logFatalAndReport(w, err)
		return
	}
	response, err := proto.Marshal(&protos.ScriptError {
		Code: scriptErr.Code,
		Message: scriptErr.Message,
	});
	if err != nil {
		logFatalAndReport(w, err)
		return
	}
	w.WriteHeader(http.StatusBadRequest);
	w.Write(response)
}

func (h *ScriptsHandler) HandleNew(w http.ResponseWriter, r *http.Request) {
	claims := h.auth.GetLoggedInUser(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	body, err := io.ReadAll(r.Body);
	if err != nil {
		logFatalAndReport(w, err)
		return
	}
	defer r.Body.Close()

	var req protos.Script
	if err = proto.Unmarshal(body, &req); err != nil {
		slog.Error(err.Error());
		w.WriteHeader(http.StatusBadRequest);
		return;
	}

	ctx := r.Context()

	newUuid, err := h.scripts.AddNewScript(ctx, claims.Uuid.String(), &req)
	if err == nil {
		w.Write([]byte(newUuid))
		return;
	}

	scriptErr, ok := err.(*service.ScriptError);
	if !ok {
		logFatalAndReport(w, err)
		return
	}
	response, err := proto.Marshal(&protos.ScriptError {
		Code: scriptErr.Code,
		Message: scriptErr.Message,
	});
	if err != nil {
		logFatalAndReport(w, err)
		return
	}

	w.WriteHeader(http.StatusBadRequest);
	w.Write(response);
}

func (h *ScriptsHandler) HandleRename(w http.ResponseWriter, r *http.Request) {
	claims := h.auth.GetLoggedInUser(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	body, err := io.ReadAll(r.Body);
	if err != nil {
		logFatalAndReport(w, err)
		return
	}
	defer r.Body.Close()

	var req protos.ScriptNameUpdate
	if err = proto.Unmarshal(body, &req); err != nil {
		slog.Error(err.Error());
		w.WriteHeader(http.StatusBadRequest);
		return;
	}

	ctx := r.Context()

	err = h.scripts.RenameScript(ctx, claims.Uuid.String(), req.ScriptId, req.NewName)

	if err == nil {
		w.WriteHeader(http.StatusNoContent);
		return;
	}

	scriptErr, ok := err.(*service.ScriptError);
	if !ok {
		logFatalAndReport(w, err)
		return
	}
	response, err := proto.Marshal(&protos.ScriptError {
		Code: scriptErr.Code,
		Message: scriptErr.Message,
	});
	if err != nil {
		logFatalAndReport(w, err)
		return
	}

	w.WriteHeader(http.StatusBadRequest);
	w.Write(response);
}

func (h *ScriptsHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	claims := h.auth.GetLoggedInUser(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	body, err := io.ReadAll(r.Body);
	if err != nil {
		logFatalAndReport(w, err)
		return
	}
	defer r.Body.Close()

	scriptUuid := string(body)

	ctx := r.Context()

	err = h.scripts.DeleteScript(ctx, claims.Uuid.String(), scriptUuid)

	if err == nil {
		w.WriteHeader(http.StatusNoContent);
		return;
	}

	scriptErr, ok := err.(*service.ScriptError);
	if !ok {
		logFatalAndReport(w, err)
		return
	}
	response, err := proto.Marshal(&protos.ScriptError {
		Code: scriptErr.Code,
		Message: scriptErr.Message,
	});
	if err != nil {
		logFatalAndReport(w, err)
		return
	}

	w.WriteHeader(http.StatusBadRequest);
	w.Write(response);
}
