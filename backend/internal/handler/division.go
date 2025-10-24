package handler

import (
	"context"

	"github.com/google/uuid"
	"github.com/stausee1337/quipt/internal/service"
)


type DivisionMutationHandler struct {
	scripts *service.ScriptsService
}

func NewDivisionHandler(scripts *service.ScriptsService) *DivisionMutationHandler {
	return &DivisionMutationHandler{scripts}
}

func (h *DivisionMutationHandler) SaveScores(ctx context.Context, scriptId uuid.UUID, divisionIdx uint, newScores []uint) error {
	userUuid := LoggedInUser(ctx)
	err := h.scripts.AddDivisionScores(ctx, userUuid, scriptId, divisionIdx, newScores)

	if err != nil {
		serr, ok := err.(service.ScriptError)
		if ok {
			return serr
		}
		panic(err)
	}

	return nil
}

func (h *DivisionMutationHandler) UpdateDescription(ctx context.Context, scriptId uuid.UUID, divisionIdx uint, description string) error {
	userUuid := LoggedInUser(ctx)
	err := h.scripts.UpdateDivisionDescription(ctx, userUuid, scriptId, divisionIdx, description)

	if err != nil {
		serr, ok := err.(service.ScriptError)
		if ok {
			return serr
		}
		panic(err)
	}

	return nil
}

func (h *DivisionMutationHandler) Rename(ctx context.Context, scriptId uuid.UUID, divisionIdx uint, name string) error {
	userUuid := LoggedInUser(ctx)
	err := h.scripts.RenameDivision(ctx, userUuid, scriptId, divisionIdx, name)

	if err != nil {
		serr, ok := err.(service.ScriptError)
		if ok {
			return serr
		}
		panic(err)
	}

	return nil
}

