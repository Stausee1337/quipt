package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

var ErrUnknownEmail = errors.New("unknown email");

type User struct {
	Uuid 		[16]byte
	Sub			*string
	Email 		string
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

func (r *UserRepo) FindUserByEmail(ctx context.Context, email string) (*User, error) {
	result := r.users.FindOne(ctx, bson.D{{Key: "Email", Value: email}});
	var user User
	if err := result.Decode(&user); err != nil {	
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrUnknownEmail;
		}
		return nil, fmt.Errorf("query user %q: %w", email, err);
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
		return fmt.Errorf("create user %q: %w", user.Email, error)
	}
	return nil
}

