package service

import (
	"context"
	"errors"
	"slices"
	"time"

	"github.com/google/uuid"
	"github.com/stausee1337/quipt/internal/qmodel"
	"github.com/stausee1337/quipt/internal/repository"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type ScriptError struct {
	message	string
}

func makeError(message string) error {
	return ScriptError{ message }
}

func (w ScriptError) Error() string {
	return w.message;
}

var errUnknownScript = makeError("unknown script")
var errInvalidScoreData = makeError("invalid score data")
var errInvalidScriptName = makeError("invalid score data")
var errDivisionOutOfBounds = makeError("division out of bounds")
var errCueOutOfBounds = makeError("cue out of bounds")

type ScriptsService struct {
	repo *repository.ScriptsRepo
}

func NewScriptsService(db *mongo.Database) *ScriptsService {
	return &ScriptsService {
		repo: repository.NewScriptsRepo(db),
	};
}

func (s *ScriptsService) GetAllScripts(ctx context.Context, userUuid uuid.UUID) ([]qmodel.Script, error) {
	rawScripts, err := s.repo.FindScriptsForOnwer(ctx, userUuid);
	if err != nil {
		return nil, err
	}

	var scripts []qmodel.Script
	for _, rawScript := range rawScripts {
		scripts = append(scripts, qmodel.Script {
			Uuid: uuid.UUID(rawScript.Uuid),
			Name: rawScript.Name,
			Divisions: []qmodel.Division{},
			CreatedAt: float64(rawScript.CreatedAt),
		});
	}

	return scripts, nil
}

func (s *ScriptsService) AddNewScript(
	ctx context.Context,
	userUuid uuid.UUID,
	script qmodel.Script,
) (*uuid.UUID, error) {
	if len(script.Name) == 0 {
		return nil, errInvalidScriptName
	}

	repoScript, repoDivisions := transformQScript(userUuid, &script);

	divisionIds, err := s.repo.InsertNewDivisions(ctx, repoDivisions)
	if err != nil {
		return nil, err
	}
	repoScript.Divisions = divisionIds;

	err = s.repo.InsertNewScript(ctx, repoScript)
	if err != nil {
		return nil, err
	}

	scriptUuid := uuid.UUID(repoScript.Uuid)
	return &scriptUuid, nil
}

func (s *ScriptsService) lookupByIdAndOwner(
	ctx context.Context,
	userUuid uuid.UUID,
	scriptUuid uuid.UUID,
) (*repository.Script, error) {
	script, err := s.repo.FindScriptById(ctx, scriptUuid)
	if errors.Is(err, repository.ErrUnknownScript) {
		return nil,	errUnknownScript 
	} else if err != nil {
		return nil, err
	}

	if script.Owner != userUuid {
		// the user doesn't own the script
		return nil, errUnknownScript
	}

	return script, nil
}

func (s *ScriptsService) GetScriptById(
	ctx context.Context,
	userUuid uuid.UUID,
	scriptUuid uuid.UUID,
) (*qmodel.Script, error) {
	script, err := s.lookupByIdAndOwner(ctx, userUuid, scriptUuid)
	if err != nil {
		return nil, err
	}

	repoDivisions, err := s.repo.QueryAllDivisionObjects(ctx, script.Divisions)
	if err != nil {
		return nil, err
	}

	divisions := transformRepoDivisions(repoDivisions);

	return &qmodel.Script {
		Uuid: uuid.UUID(script.Uuid),
		Name: script.Name,
		Divisions: divisions,
	}, nil
}

func (s *ScriptsService) RenameScript(
	ctx context.Context,
	userUuid uuid.UUID,
	scriptUuid uuid.UUID,
	newName string,
) error {
	if len(newName) == 0 {
		return errInvalidScriptName
	}

	script, err := s.lookupByIdAndOwner(ctx, userUuid, scriptUuid)
	if err != nil {
		return err
	}

	return s.repo.UpdateScriptName(ctx, script.Uuid, newName)
}


func (s *ScriptsService) DeleteScript(
	ctx context.Context,
	userUuid uuid.UUID,
	scriptUuid uuid.UUID,
) error {
	script, err := s.lookupByIdAndOwner(ctx, userUuid, scriptUuid)
	if err != nil {
		return err
	}

	err = s.repo.DeleteDivisions(ctx, script.Divisions)
	if err != nil {
		return err
	}

	return s.repo.DeleteScript(ctx, scriptUuid);
}

func (s *ScriptsService) AddDivisionScores(
	ctx context.Context,
	userUuid uuid.UUID,
	scriptUuid uuid.UUID,
	divisionIdx uint,
	newScores []uint,
) error {
	if slices.Contains(newScores, 0) {
		return errInvalidScoreData
	}

	script, err := s.lookupByIdAndOwner(ctx, userUuid, scriptUuid)
	if err != nil {
		return err
	}

	if divisionIdx >= uint(len(script.Divisions)) {
		return errDivisionOutOfBounds
	}

	divisionId := script.Divisions[divisionIdx];

	division, err := s.repo.LoadDivision(ctx, divisionId)
	if err != nil {
		return err
	}

	if len(division.TextCues) != len(newScores) {
		return errInvalidScoreData
	}

	return s.repo.UpdateTextCueScores(
		ctx,
		divisionId,
		mapSlice(newScores, func(x uint) uint32 { return uint32(x) }),
	)
}

func (s *ScriptsService) UpdateDivisionDescription(
	ctx context.Context,
	userUuid uuid.UUID,
	scriptUuid uuid.UUID,
	divisionIdx uint,
	description string,
) error {
	script, err := s.lookupByIdAndOwner(ctx, userUuid, scriptUuid)
	if err != nil {
		return err
	}

	if divisionIdx >= uint(len(script.Divisions)) {
		return errDivisionOutOfBounds
	}

	divisionId := script.Divisions[divisionIdx];

	return s.repo.UpdateDivisionDescription(
		ctx,
		divisionId,
		description,
	)
}

func (s *ScriptsService) RenameDivision(
	ctx context.Context,
	userUuid uuid.UUID,
	scriptUuid uuid.UUID,
	divisionIdx uint,
	description string,
) error {
	script, err := s.lookupByIdAndOwner(ctx, userUuid, scriptUuid)
	if err != nil {
		return err
	}

	if divisionIdx >= uint(len(script.Divisions)) {
		return errDivisionOutOfBounds
	}

	divisionId := script.Divisions[divisionIdx];

	return s.repo.RenameDivision(
		ctx,
		divisionId,
		description,
	)
}

func (s *ScriptsService) InsertCue(
	ctx context.Context,
	userUuid uuid.UUID,
	scriptUuid uuid.UUID,
	divisionIdx uint,
	cueIdx uint,
	qCuePair *qmodel.TextCuePair,
) error {
	script, err := s.lookupByIdAndOwner(ctx, userUuid, scriptUuid)
	if err != nil {
		return err
	}

	if divisionIdx >= uint(len(script.Divisions)) {
		return errDivisionOutOfBounds
	}

	textCuePair := transformQTextCuePair(qCuePair);

	return s.repo.InsertCueAtIndex(
		ctx,
		script.Divisions[divisionIdx],
		cueIdx,
		textCuePair,
	);
}

func (s *ScriptsService) UpdateCue(
	ctx context.Context,
	userUuid uuid.UUID,
	scriptUuid uuid.UUID,
	divisionIdx uint,
	cueIdx uint,
	qCuePair *qmodel.TextCuePair,
) error {
	script, err := s.lookupByIdAndOwner(ctx, userUuid, scriptUuid)
	if err != nil {
		return err
	}

	if divisionIdx >= uint(len(script.Divisions)) {
		return errDivisionOutOfBounds
	}

	division, err := s.repo.LoadDivision(ctx, script.Divisions[divisionIdx]);
	if err != nil {
		return err
	}

	if cueIdx >= uint(len(division.TextCues)) {
		return errCueOutOfBounds
	}

	textCuePair := transformQTextCuePair(qCuePair);
	textCuePair.PreviousScores = division.TextCues[cueIdx].PreviousScores

	return s.repo.UpdateCueAtIndex(
		ctx,
		script.Divisions[divisionIdx],
		cueIdx,
		textCuePair,
	);
}

func (s *ScriptsService) DeleteCue(
	ctx context.Context,
	userUuid uuid.UUID,
	scriptUuid uuid.UUID,
	divisionIdx uint,
	cueIdx uint,
) error {
	script, err := s.lookupByIdAndOwner(ctx, userUuid, scriptUuid)
	if err != nil {
		return err
	}

	if divisionIdx >= uint(len(script.Divisions)) {
		return errDivisionOutOfBounds
	}

	return s.repo.DeleteCueAtIndex(ctx, script.Divisions[divisionIdx], cueIdx);
}

func transformQScript(owner uuid.UUID, script *qmodel.Script) (repository.Script, []repository.Division) {
	var resultDivisions []repository.Division

	for _, division := range script.Divisions {
		resultTextCues := transformQTextCues(division.TextCues);
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

func transformQTextCues(textCues []qmodel.TextCuePair) []repository.TextCuePair {
	var resultTextCues []repository.TextCuePair

	for _, textCue := range textCues {
		resultTextCues = append(
			resultTextCues,
			transformQTextCuePair(&textCue),
		)
	}

	return resultTextCues
}

func transformQTextCuePair(pair *qmodel.TextCuePair) repository.TextCuePair {
	var resultRequest *repository.TextCue = nil
	if pair.Request != nil {
		stackCue := transformQTextCue(pair.Request)
		resultRequest = &stackCue;
	}
	return repository.TextCuePair {
		Request: resultRequest,
		Response: transformQTextCue(&pair.Response),
		PreviousScores: []uint32{},
	};
}

func transformQTextCue(textCue *qmodel.TextCue) repository.TextCue {
	return repository.TextCue {
		Actors: textCue.Actors,
		Text: textCue.Text,
	}
}

func transformRepoDivisions(repoDivisions []*repository.Division) []qmodel.Division {
	var resultDivisions []qmodel.Division

	for _, repoDivision := range repoDivisions {
		resultTextCues := transformRepoTextCues(repoDivision.TextCues);
		resultDivisions = append(resultDivisions, qmodel.Division {
			Name: repoDivision.Name,
			Description: repoDivision.Description,
			PreviousTotals: mapSlice(repoDivision.PreviousTotals, func (x uint32) uint { return uint(x) }),
			TextCues: resultTextCues,
		})
	}

	return resultDivisions
}

func transformRepoTextCues(repoTextCues []repository.TextCuePair) []qmodel.TextCuePair {
	var resultTextCues []qmodel.TextCuePair

	for _, repoTextCue := range repoTextCues {
		var resultRequest *qmodel.TextCue = nil
		if repoTextCue.Request != nil {
			qslot := transformRepoTextCue(*repoTextCue.Request)
			resultRequest = &qslot
		}
		resultTextCues = append(resultTextCues, qmodel.TextCuePair {
			Request: resultRequest,
			Response: transformRepoTextCue(repoTextCue.Response),
			PreviousScores: mapSlice(repoTextCue.PreviousScores, func (x uint32) uint { return uint(x) }),
		})
	}

	return resultTextCues
}

func transformRepoTextCue(textCue repository.TextCue) qmodel.TextCue {
	return qmodel.TextCue {
		Actors: textCue.Actors,
		Text: textCue.Text,
	};
}

func mapSlice[T, V any](ts []T, fn func(T) V) []V {
	result := make([]V, len(ts))
	for i, t := range ts {
		result[i] = fn(t)
	}
	return result
}
