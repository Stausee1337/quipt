package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/crypto/bcrypt"

	"github.com/stausee1337/quipt/internal/repository"
	"github.com/stausee1337/quipt/protos"
)

const bcryptCost = 14;

type AuthError struct {
	Code 	protos.AuthErrorCode
	Message string
}

func (w *AuthError) Error() string {
	return w.Message;
}

type UserService struct {
	repo *repository.UserRepo
}

func NewUserService(db *mongo.Database) *UserService {
	return &UserService{
		repo: repository.NewUserRepo(db),
	}
}

func (s *UserService) hashPassword(password string) ([]byte, error) {
	result, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost);
	if err != nil {
		return nil, fmt.Errorf("hashing password %q: %w", password, err);
	}
	return result, nil
}

func (s* UserService) Signin(
	ctx context.Context,
	username string,
	password string,
) (*protos.User, error) {
	user, err := s.repo.FindUserByName(ctx, username)
	if err != nil {
		if errors.Is(err, repository.ErrUnknownUser) {
			// we should do compare hash and password here anyways,
			// in order not to have a response time difference between email or password invalid
			return nil, &AuthError{
				Code: protos.AuthErrorCode_INVALID_CREDENTIALS,
				Message: "invalid credentials",
			};
		}
		return nil, err;
	}

	passwordBytes := []byte(password)
	if len(passwordBytes) > 72 {
		passwordBytes = passwordBytes[:72]
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), passwordBytes);
	if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		return nil, &AuthError{
			Code: protos.AuthErrorCode_INVALID_CREDENTIALS,
			Message: "invalid credentials",
		};
	} else if err != nil {
		return nil, fmt.Errorf("could not hash password %q: %w", username, err);
	}

	return &protos.User{
		Id: uuid.UUID(user.Uuid).String(),
		Username: user.Username,
		Verified: user.Verified,
	}, nil;
}

func (s *UserService) Signup(
	ctx context.Context,
	username string,
	password string,
	sub *string,
	verified bool,
) (*protos.User, error) {
	if len(username) < 3 {
		return nil, &AuthError {
			Code: protos.AuthErrorCode_USERNAME_MALFORMED,
			Message: "malformed username",
		}
	}

	if !simplePasswordCheck(password) {
		return nil, &AuthError {
			Code: protos.AuthErrorCode_WEAK_PASSWORD,
			Message: "password too weak",
		}
	}
	_, err := s.repo.FindUserByName(ctx, username)
	if err == nil {
		return nil, &AuthError {
			Code: protos.AuthErrorCode_USERNAME_ALREADY_EXISTS,
			Message: "username already exists",
		}
	} else if !errors.Is(err, repository.ErrUnknownUser) {
		return nil, err;
	}

	hashed_password, err := s.hashPassword(password);
	if err != nil {
		return nil, err;
	}

	user := repository.User {
		Sub: sub,
		Username: username,
		Password: hashed_password,
		Verified: verified,	
	};
	err = s.repo.CreateUser(ctx, &user);
	if err != nil {
		return nil, err;
	}

	return &protos.User {
		Id: uuid.UUID(user.Uuid).String(),
		Username: username,
		Verified: verified,
	}, nil;
}

func (s *UserService) GetUserById(ctx context.Context, uuidString string) (*protos.User, error) {
	parsedUuid, err := uuid.Parse(uuidString)
	if err != nil {
		return nil, fmt.Errorf("could not parse user uuid %q: %w", uuidString, err)
	}

	user, err := s.repo.FindUserById(ctx, parsedUuid)
	if err != nil {
		return nil, err
	}

	return &protos.User {
		Id: uuid.UUID(user.Uuid).String(),
		Username: user.Username,
		Verified: user.Verified,
	}, nil;
}

const PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
const NUMERIC = "0123456789"
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

func containsAny(target string, needles string) bool {
	for i := 0; i < len(needles); i++ {
		if strings.ContainsRune(target, rune(needles[i])) {
			return true
		}
	}
	return false;

}

// TODO: a better check would be to run against a small list of common passwords
func simplePasswordCheck(password string) bool {
	if len(password) < 8 {
		return false;
	}
	if len(password) > 72 {
		// FIXME: we currently return `WEAK_PASSWORD` in the too long for bcrypt case
		return false;
	}
	if !containsAny(password, PUNCTUATION) {
		return false;
	}
	if !containsAny(password, NUMERIC) {
		return false;
	}
	if !containsAny(password, LOWERCASE) {
		return false;
	}
	if !containsAny(password, UPPERCASE) {
		return false;
	}
	return true;
}

