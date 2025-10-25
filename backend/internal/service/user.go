package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/v2/mongo"

	"github.com/stausee1337/quipt/internal/qmodel"
	"github.com/stausee1337/quipt/internal/repository"
)

const bcryptCost = 14;

type AuthError qmodel.AuthError

func (w AuthError) Error() string {
	return string(w);
}

type UserService struct {
	repo *repository.UserRepo
}

type User struct {
	qmodel.User
	sub 	 *string
	password []byte
}

func NewUserService(db *mongo.Database) *UserService {
	return &UserService{
		repo: repository.NewUserRepo(db),
	}
}

func (s *UserService) GetById(ctx context.Context, userUuid uuid.UUID) (*User, error) {
	user, err := s.repo.FindUserById(ctx, userUuid)
	if err != nil {
		return nil, err
	}

	return &User {
		User: qmodel.User{
			Uuid: uuid.UUID(user.Uuid),
			Username: user.Username,
			Verified: user.Verified,
		},
		password: user.Password,
	}, nil;
}

func (s *UserService) GetByUsername(ctx context.Context, username string) (*User, error) {
	user, err := s.repo.FindUserByName(ctx, username)
	if err != nil {
		return nil, err;
	}
	return &User {
		User: qmodel.User{
			Uuid: uuid.UUID(user.Uuid),
			Username: user.Username,
			Verified: user.Verified,
		},
		password: user.Password,
	}, nil 
}

func (s *UserService) CreateUser(ctx context.Context, user *User) error {
	uuid, error := uuid.NewV7();
	if error != nil {
		return fmt.Errorf("could not create uuid: %w", error)
	}

	repoUser := &repository.User{
		Uuid: uuid,
		Sub: user.sub,
		Username: user.Username,
		Password: user.password,
		Verified: user.Verified,
	}
	return s.repo.CreateUser(ctx, repoUser);
}

