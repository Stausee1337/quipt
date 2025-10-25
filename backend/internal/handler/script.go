package handler

import (
	"context"

	"github.com/google/uuid"
	"github.com/stausee1337/quipt/internal/qmodel"
	"github.com/stausee1337/quipt/internal/service"
)

type ScriptQueryHandler struct {
	scripts *service.ScriptsService
}

type ScriptMutationHandler struct {
	scripts *service.ScriptsService
}

func NewScriptHandlers(scripts *service.ScriptsService) (*ScriptQueryHandler, *ScriptMutationHandler) {
	return &ScriptQueryHandler{scripts}, &ScriptMutationHandler{scripts}
}

func (h *ScriptQueryHandler) List(ctx context.Context) (*[]qmodel.Script, error) {
	userUuid := LoggedInUser(ctx)

	scripts, err := h.scripts.GetAllScripts(ctx, userUuid)
	if err != nil {
		panic(err)
	}

	return &scripts, nil
}

func (h *ScriptQueryHandler) Get(ctx context.Context, uuid uuid.UUID) (*qmodel.Script, error) {
	userUuid := LoggedInUser(ctx)

	script, err := h.scripts.GetScriptById(ctx, userUuid, uuid)
	if err != nil {
		serr, ok := err.(service.ScriptError)
		if ok {
			return nil, serr
		}
		panic(err)
	}

	return script, nil
}

func (h *ScriptMutationHandler) Rename(ctx context.Context, uuid uuid.UUID, name string) error {
	userUuid := LoggedInUser(ctx)
	err := h.scripts.RenameScript(ctx, userUuid, uuid, name)

	if err != nil {
		serr, ok := err.(service.ScriptError)
		if ok {
			return serr
		}
		panic(err)
	}

	return nil
}

func (h *ScriptMutationHandler) Create(ctx context.Context, script qmodel.Script) (*uuid.UUID, error) {
	userUuid := LoggedInUser(ctx)
	uuid, err := h.scripts.AddNewScript(ctx, userUuid, script)

	if err != nil {
		serr, ok := err.(service.ScriptError)
		if ok {
			return nil, serr
		}
		panic(err)
	}

	return uuid, nil
}

func (h *ScriptMutationHandler) Delete(ctx context.Context, uuid uuid.UUID) error {
	userUuid := LoggedInUser(ctx)
	err := h.scripts.DeleteScript(ctx, userUuid, uuid)

	if err != nil {
		serr, ok := err.(service.ScriptError)
		if ok {
			return serr
		}
		panic(err)
	}

	return nil
}

