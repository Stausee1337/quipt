package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/stausee1337/quipt/internal/repository"
	"github.com/stausee1337/quipt/protos"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type ScriptsService struct {
	repo *repository.ScriptsRepo
}

func NewScriptsService(db *mongo.Database) *ScriptsService {
	return &ScriptsService {
		repo: repository.NewScriptsRepo(db),
	};
}

func (s *ScriptsService) GetAllScripts(
	ctx context.Context,
	userUuid string,
) ([]*protos.Script, error) {
	parsedUserId, err := uuid.Parse(userUuid)
	if err != nil {
		return nil, fmt.Errorf("could not parse uuid %q: %w", userUuid, err)
	}

	rawScripts, err := s.repo.GetScriptsForOnwer(ctx, parsedUserId);
	if err != nil {
		return nil, err
	}

	var scripts []*protos.Script
	for _, rawScript := range rawScripts {
		scripts = append(scripts, &protos.Script {
			Uuid: uuid.UUID(rawScript.Uuid).String(),
			Name: rawScript.Name,
			Divisions: nil,
		});
	}

	return scripts, nil
}

