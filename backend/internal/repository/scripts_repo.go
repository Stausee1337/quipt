package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

var ErrUnknownScript = errors.New("unknown script");

type Script struct {
	Uuid 		[16]byte
	Owner		[16]byte
	Name		string
	Divisions	[]bson.ObjectID
}

type Division struct {
	_id 			bson.ObjectID
	Name			string
	PreviousTotals	[]uint32
	TextCues 		[]TextCuePair
}

type TextCuePair struct {
	Request			*TextCue
	Response		TextCue
	PreviousScores	[]uint32
}

type TextCue struct {
	Actors	[]string
	Text	string
}

type ScriptsRepo struct {
	scripts *mongo.Collection
	divisions *mongo.Collection
}

func NewScriptsRepo(db *mongo.Database) *ScriptsRepo {
	return &ScriptsRepo {
		scripts: db.Collection("Scripts"),
		divisions: db.Collection("Divisions"),
	};
}

func (r *ScriptsRepo) FindScriptsForOnwer(ctx context.Context, user uuid.UUID) ([]*Script, error) {
	cursor, err := r.scripts.Find(ctx, bson.D{{Key: "owner", Value: user}});
	if err != nil {
		return nil, fmt.Errorf("could not query by owner %q: %w", user, err);
	}

	defer cursor.Close(ctx)

	var scripts []*Script
	for cursor.Next(ctx) {
		var script Script
		if err := cursor.Decode(&script); err != nil {
			return nil, fmt.Errorf("could not query by owner %q: %w", user, err);
		}
		scripts = append(scripts, &script)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("could not query by owner %q: %w", user, err);
	}

	return scripts, nil
}

func (r *ScriptsRepo) FindScriptById(ctx context.Context, id uuid.UUID) (*Script, error) {

	result := r.scripts.FindOne(ctx, bson.D{{Key: "uuid", Value: id}});
	var script Script
	if err := result.Decode(&script); err != nil {	
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrUnknownScript;
		}
		return nil, fmt.Errorf("query user %q: %w", id, err);
	}
	return &script, nil
}

func (r* ScriptsRepo) QueryAllDivisionObjects(ctx context.Context, division_ids []bson.ObjectID) ([]*Division, error) {
	cursor, err := r.divisions.Find(ctx, bson.M{"_id": bson.M{"$in": division_ids}});
	if err != nil {
		return nil, fmt.Errorf("could not query by ids %q: %w", division_ids, err);
	}

	defer cursor.Close(ctx)

	var divisions []*Division
	for cursor.Next(ctx) {
		var division Division
		if err := cursor.Decode(&division); err != nil {
			return nil, fmt.Errorf("could not query by ids %q: %w", division_ids, err);
		}
		divisions = append(divisions, &division)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("could not query by ids %q: %w", division_ids, err);
	}

	return divisions, nil
}

