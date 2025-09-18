package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Script struct {
	Uuid 		[16]byte
	Owner		[16]byte
	Name		string
	Divisions	[]bson.ObjectID
}

type Division struct {
	_id 		bson.ObjectID
	Name		string
	Divisions	[]bson.ObjectID
}

type ScriptsRepo struct {
	scripts *mongo.Collection
}

func NewScriptsRepo(db *mongo.Database) *ScriptsRepo {
	return &ScriptsRepo {
		scripts: db.Collection("Scripts"),
	};
}

func (r *ScriptsRepo) GetScriptsForOnwer(ctx context.Context, user uuid.UUID) ([]*Script, error) {
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

