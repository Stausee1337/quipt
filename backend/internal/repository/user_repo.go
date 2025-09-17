package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

var ErrUnknownUser = errors.New("unknown email");

type User struct {
	Uuid 		[16]byte
	Sub			*string
	Username 	string
	Password 	[]byte
	Verified 	bool
}

type UserRepo struct {
	users *mongo.Collection
}

func NewUserRepo(db *mongo.Database) *UserRepo {
	return &UserRepo {
		users: db.Collection("Users"),
	};
}

func (r *UserRepo) FindUserByName(ctx context.Context, username string) (*User, error) {
	result := r.users.FindOne(ctx, bson.D{{Key: "username", Value: username}});
	var user User
	if err := result.Decode(&user); err != nil {	
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrUnknownUser;
		}
		return nil, fmt.Errorf("query user %q: %w", username, err);
	}
	return &user, nil
}

func (r *UserRepo) CreateUser(ctx context.Context, user *User) error {
	uuid, error := uuid.NewV7();
	if error != nil {
		return fmt.Errorf("create uuid: %w", error)
	}
	user.Uuid = uuid
	_, error = r.users.InsertOne(ctx, user);
	if error != nil {
		return fmt.Errorf("create user %q: %w", user.Username, error)
	}
	return nil
}

