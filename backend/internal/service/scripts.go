package service

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/google/uuid"
	"github.com/stausee1337/quipt/internal/repository"
	"github.com/stausee1337/quipt/protos"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type ScriptError struct {
	Code	protos.ScriptErrorCode
	Message	string
}

func (w *ScriptError) Error() string {
	return w.Message;
}

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

	rawScripts, err := s.repo.FindScriptsForOnwer(ctx, parsedUserId);
	if err != nil {
		return nil, err
	}

	var scripts []*protos.Script
	for _, rawScript := range rawScripts {
		scripts = append(scripts, &protos.Script {
			Uuid: uuid.UUID(rawScript.Uuid).String(),
			Name: rawScript.Name,
			Divisions: nil,
			CreatedAt: rawScript.CreatedAt,
		});
	}

	return scripts, nil
}

func (s *ScriptsService) GetScriptById(
	ctx context.Context,
	userUuid string,
	uuidString string,
) (*protos.Script, error) {
	parsedUserId, err := uuid.Parse(userUuid)
	if err != nil {
		return nil, fmt.Errorf("could not parse uuid %q: %w", userUuid, err)
	}

	parsedUuid, err := uuid.Parse(uuidString)
	if err != nil {
		return nil, &ScriptError {
			Code: protos.ScriptErrorCode_ID_MALFORMED,
			Message: "malformed id",
		}
	}

	script, err := s.repo.FindScriptById(ctx, parsedUuid)
	if errors.Is(err, repository.ErrUnknownScript) {
		return nil, &ScriptError {
			Code: protos.ScriptErrorCode_UNKNOWN_SCRIPT,
			Message: "unknown script",
		}
	} else if err != nil {
		return nil, err
	}

	if script.Owner != parsedUserId {
		// the user doesn't own the script
		return nil, &ScriptError {
			Code: protos.ScriptErrorCode_UNKNOWN_SCRIPT,
			Message: "unknown script",
		}
	}

	repoDivisions, err := s.repo.QueryAllDivisionObjects(ctx, script.Divisions)
	if err != nil {
		return nil, err
	}

	divisions := transformRepoDivisions(repoDivisions);

	return &protos.Script {
		Uuid: uuid.UUID(script.Uuid).String(),
		Name: script.Name,
		Divisions: divisions,
	}, nil
}

func (s *ScriptsService) UpdateScriptDivisionScores(
	ctx context.Context,
	userUuid string,
	request *protos.DivisionScoreUpdate,
) error {
	if slices.Contains(request.NewScores, 0) {
		return &ScriptError {
			Code: protos.ScriptErrorCode_INVALID_SCORE_DATA,
			Message: "invalid score data",
		}
	}

	parsedUserId, err := uuid.Parse(userUuid)
	if err != nil {
		return fmt.Errorf("could not parse uuid %q: %w", userUuid, err)
	}

	parsedUuid, err := uuid.Parse(request.ScriptId)
	if err != nil {
		return &ScriptError {
			Code: protos.ScriptErrorCode_ID_MALFORMED,
			Message: "malformed id",
		}
	}

	script, err := s.repo.FindScriptById(ctx, parsedUuid)
	if errors.Is(err, repository.ErrUnknownScript) {
		return &ScriptError {
			Code: protos.ScriptErrorCode_UNKNOWN_SCRIPT,
			Message: "unknown script",
		}
	} else if err != nil {
		return err
	}

	if script.Owner != parsedUserId {
		// the user doesn't own the script
		return &ScriptError {
			Code: protos.ScriptErrorCode_UNKNOWN_SCRIPT,
			Message: "unknown script",
		}
	}

	if request.DivisionIdx >= uint32(len(script.Divisions)) {
		return &ScriptError {
			Code: protos.ScriptErrorCode_DIVISION_OUT_OF_BOUNDS,
			Message: "division out of bounds",
		}
	}

	divisionId := script.Divisions[request.DivisionIdx];

	division, err := s.repo.LoadDivision(ctx, divisionId)
	if err != nil {
		return err
	}

	if len(division.TextCues) != len(request.NewScores) {
		return &ScriptError {
			Code: protos.ScriptErrorCode_INVALID_SCORE_DATA,
			Message: "invalid score data",
		}
	}

	err = s.repo.UpdateTextCueScores(ctx, divisionId, request.NewScores)
	return err
}

func (s *ScriptsService) RenameScript(
	ctx context.Context,
	userUuid string,
	scriptUuid string,
	newName string,
) error {
	if len(newName) == 0 {
		return &ScriptError {
			Code: protos.ScriptErrorCode_INVALID_SCRIPT_NAME,
			Message: "invalid script name",
		}
	}

	parsedUserId, err := uuid.Parse(userUuid)
	if err != nil {
		return fmt.Errorf("could not parse uuid %q: %w", userUuid, err)
	}

	parsedUuid, err := uuid.Parse(scriptUuid)
	if err != nil {
		return &ScriptError {
			Code: protos.ScriptErrorCode_ID_MALFORMED,
			Message: "malformed id",
		}
	}

	script, err := s.repo.FindScriptById(ctx, parsedUuid)
	if errors.Is(err, repository.ErrUnknownScript) {
		return &ScriptError {
			Code: protos.ScriptErrorCode_UNKNOWN_SCRIPT,
			Message: "unknown script",
		}
	} else if err != nil {
		return err
	}

	if script.Owner != parsedUserId {
		// the user doesn't own the script
		return &ScriptError {
			Code: protos.ScriptErrorCode_UNKNOWN_SCRIPT,
			Message: "unknown script",
		}
	}

	err = s.repo.UpdateScriptName(ctx, parsedUuid, newName)
	if err != nil {
		return err
	}

	return nil
}

func (s *ScriptsService) AddNewScript(
	ctx context.Context,
	userUuid string,
	script *protos.Script,
) (string, error) {
	if len(script.Name) == 0 {
		return "", &ScriptError {
			Code: protos.ScriptErrorCode_INVALID_SCRIPT_NAME,
			Message: "invalid script name",
		}
	}

	parsedUserId, err := uuid.Parse(userUuid)
	if err != nil {
		return "", fmt.Errorf("could not parse uuid %q: %w", userUuid, err)
	}

	repoScript, repoDivisions := transformProtoScript(parsedUserId, script);

	divisionIds, err := s.repo.InsertNewDivisions(ctx, repoDivisions)
	if err != nil {
		return "", err
	}
	repoScript.Divisions = divisionIds;

	err = s.repo.InsertNewScript(ctx, repoScript)
	if err != nil {
		return "", err
	}

	return uuid.UUID(repoScript.Uuid).String(), nil
}

func (s *ScriptsService) DeleteScript(
	ctx context.Context,
	userUuid string,
	scriptUuid string,
) error {
	parsedUserId, err := uuid.Parse(userUuid)
	if err != nil {
		return fmt.Errorf("could not parse uuid %q: %w", userUuid, err)
	}

	parsedUuid, err := uuid.Parse(scriptUuid)
	if err != nil {
		return &ScriptError {
			Code: protos.ScriptErrorCode_ID_MALFORMED,
			Message: "malformed id",
		}
	}

	script, err := s.repo.FindScriptById(ctx, parsedUuid)
	if errors.Is(err, repository.ErrUnknownScript) {
		return &ScriptError {
			Code: protos.ScriptErrorCode_UNKNOWN_SCRIPT,
			Message: "unknown script",
		}
	} else if err != nil {
		return err
	}

	if script.Owner != parsedUserId {
		// the user doesn't own the script
		return &ScriptError {
			Code: protos.ScriptErrorCode_UNKNOWN_SCRIPT,
			Message: "unknown script",
		}
	}

	err = s.repo.DeleteDivisions(ctx, script.Divisions)
	if err != nil {
		return err
	}

	err = s.repo.DeleteScript(ctx, parsedUuid);
	if err != nil {
		return err
	}

	return nil
}

func transformProtoScript(owner uuid.UUID, script *protos.Script) (repository.Script, []repository.Division) {
	var resultDivisions []repository.Division

	for _, division := range script.Divisions {
		resultTextCues := transformProtoTextCues(division.TextCues);
		resultDivision := repository.Division{
			Name: division.Name,
			Description: division.Description,
			PreviousTotals: []uint32{},
			TextCues: resultTextCues,
		}
		resultDivisions = append(resultDivisions, resultDivision);
	}

	return repository.Script {
		Uuid: uuid.New(),
		Name: script.Name,
		Divisions: []bson.ObjectID{},
		Owner: owner,
		CreatedAt: time.Now().UnixMilli(),
	}, resultDivisions
}

func transformProtoTextCues(textCues []*protos.TextCuePair) []repository.TextCuePair {
	var resultTextCues []repository.TextCuePair

	for _, textCue := range textCues {
		var resultRequest *repository.TextCue = nil
		if textCue.Request != nil {
			stackCue := transformProtoTextCue(textCue.Request)
			resultRequest = &stackCue;
		}
		resultTextCue := repository.TextCuePair {
			Request: resultRequest,
			Response: transformProtoTextCue(textCue.Response),
			PreviousScores: []uint32{},
		};
		resultTextCues = append(resultTextCues, resultTextCue)
	}

	return resultTextCues
}

func transformProtoTextCue(textCue *protos.TextCue) repository.TextCue {
	return repository.TextCue {
		Actors: textCue.Actors,
		Text: textCue.Text,
	}
}

func transformRepoDivisions(repoDivisions []*repository.Division) []*protos.Division {
	var resultDivisions []*protos.Division

	for _, repoDivision := range repoDivisions {
		resultTextCues := transformRepoTextCues(repoDivision.TextCues);
		resultDivision := protos.Division {
			Name: repoDivision.Name,
			Description: repoDivision.Description,
			PreviousTotals: repoDivision.PreviousTotals,
			TextCues: resultTextCues,
		};
		resultDivisions = append(resultDivisions, &resultDivision)
	}

	return resultDivisions
}

func transformRepoTextCues(repoTextCues []repository.TextCuePair) []*protos.TextCuePair {
	var resultTextCues []*protos.TextCuePair

	for _, repoTextCue := range repoTextCues {
		var resultRequest *protos.TextCue = nil
		if repoTextCue.Request != nil {
			resultRequest = transformRepoTextCue(*repoTextCue.Request)
		}
		resultTextCue := protos.TextCuePair {
			Request: resultRequest,
			Response: transformRepoTextCue(repoTextCue.Response),
			PreviousScores: repoTextCue.PreviousScores,
		};
		resultTextCues = append(resultTextCues, &resultTextCue)
	}

	return resultTextCues
}

func transformRepoTextCue(textCue repository.TextCue) *protos.TextCue {
	return &protos.TextCue {
		Actors: textCue.Actors,
		Text: textCue.Text,
	};
}

