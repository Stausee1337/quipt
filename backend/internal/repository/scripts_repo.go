package repository

import (
	"context"
	"errors"
	"fmt"
	"slices"

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
	CreatedAt	int64
}

type Division struct {
	ID 				bson.ObjectID 	`bson:"_id,omitempty"`
	Name			string
	Description		string
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
		return nil, fmt.Errorf("query script %q: %w", id, err);
	}
	return &script, nil
}

func (r* ScriptsRepo) QueryAllDivisionObjects(ctx context.Context, divisionIds []bson.ObjectID) ([]*Division, error) {
	cursor, err := r.divisions.Find(ctx, bson.M{"_id": bson.M{"$in": divisionIds}});
	if err != nil {
		return nil, fmt.Errorf("could not query by ids %q: %w", divisionIds, err);
	}

	defer cursor.Close(ctx)

	var divisions []*Division
	for cursor.Next(ctx) {
		var division Division
		if err := cursor.Decode(&division); err != nil {
			return nil, fmt.Errorf("could not query by ids %q: %w", divisionIds, err);
		}
		divisions = append(divisions, &division)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("could not query by ids %q: %w", divisionIds, err);
	}

	slices.SortFunc(divisions, func (a *Division, b *Division) int {
		return slices.Index(divisionIds, a.ID) - slices.Index(divisionIds, b.ID)
	});

	return divisions, nil
}

func (r *ScriptsRepo) LoadDivision(
	ctx context.Context,
	divisionId bson.ObjectID,
) (*Division, error) {

	result := r.divisions.FindOne(ctx, bson.M{"_id": divisionId});
	var division Division
	if err := result.Decode(&division); err != nil {	
		return nil, fmt.Errorf("query script %q: %w", divisionId, err);
	}
	return &division, nil
}

func (r *ScriptsRepo) UpdateTextCueScores(ctx context.Context, division bson.ObjectID, newScores []uint32) error {
	update := mongo.Pipeline{
		bson.D{{Key: "$set", Value: bson.M{
                "textCues": bson.M{
                    "$map": bson.M{
                        "input": bson.M{"$range": bson.A{0, bson.M{"$size": "$textCues"}}},
                        "as": "idx",
                        "in": bson.M{
                            "$mergeObjects": bson.A{
                                bson.M{"$arrayElemAt": bson.A{"$textCues", "$$idx"}},
                                bson.M{
                                    "previousScores": bson.M{
                                        "$concatArrays": bson.A{
                                            bson.M{
                                                "$getField": bson.M{
                                                    "field": "previousScores",
                                                    "input": bson.M{"$arrayElemAt": bson.A{"$textCues", "$$idx"}},
                                                },
                                            },
                                            bson.A{
												bson.M{"$arrayElemAt": bson.A{newScores, "$$idx"}},
											},
										},
                                    },
                                },
							},
                        },
                    },
                },
            },
		}},
	};
	_, err := r.divisions.UpdateOne(
		ctx,
		bson.M{"_id": division},
		update,
	);

	if err != nil {
		return fmt.Errorf("could not aggregate new scores %q: %w", division, err);
	}

	var sum uint32 = 0
	for _, score := range newScores {
		sum += score
	}

	_, err = r.divisions.UpdateOne(
		ctx,
		bson.M{"_id": division},
		bson.M{"$push": bson.M{"previousTotals": sum}},
	)

	if err != nil {
		return fmt.Errorf("could not push new total score %q: %w", division, err);
	}

	return nil;
}

