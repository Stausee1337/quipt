package handler

import (
	"context"

	"github.com/google/uuid"
	"github.com/stausee1337/quipt/internal/qmodel"
	"github.com/stausee1337/quipt/internal/service"
)

type TextCueMutationHandler struct {
	scripts *service.ScriptsService
}

func NewCueHandler(scripts *service.ScriptsService) *TextCueMutationHandler {
	return &TextCueMutationHandler{scripts}
}

func (h *TextCueMutationHandler) Insert(ctx context.Context, uuid uuid.UUID, divisionIdx uint, cueIdx uint, cue qmodel.TextCuePair) error {
	userUuid := LoggedInUser(ctx)
	err := h.scripts.InsertCue(ctx, userUuid, uuid, divisionIdx, cueIdx, &cue)

	if err != nil {
		serr, ok := err.(service.ScriptError)
		if ok {
			return serr
		}
		panic(err)
	}

	return nil
}

func (h *TextCueMutationHandler) Update(ctx context.Context, uuid uuid.UUID, divisionIdx uint, cueIdx uint, newCue qmodel.TextCuePair) error {
	userUuid := LoggedInUser(ctx)
	err := h.scripts.UpdateCue(ctx, userUuid, uuid, divisionIdx, cueIdx, &newCue)

	if err != nil {
		serr, ok := err.(service.ScriptError)
		if ok {
			return serr
		}
		panic(err)
	}

	return nil
}

func (h *TextCueMutationHandler) Delete(ctx context.Context, uuid uuid.UUID, divisionIdx uint, cueIdx uint) error {
	userUuid := LoggedInUser(ctx)
	err := h.scripts.DeleteCue(ctx, userUuid, uuid, divisionIdx, cueIdx)

	if err != nil {
		serr, ok := err.(service.ScriptError)
		if ok {
			return serr
		}
		panic(err)
	}

	return nil
}


