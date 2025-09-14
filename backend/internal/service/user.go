package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
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
	repo 		*repository.UserRepo
	emailRegex	*regexp.Regexp
}

const EMAIL_REGEX = `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`;

func NewUserService(db *mongo.Database) *UserService {
	regex, err := regexp.Compile(EMAIL_REGEX);
	if err != nil {
		panic(err);
	}
	return &UserService{
		repo: repository.NewUserRepo(db),
		emailRegex: regex,
	}
}

func (s *UserService) validateEmail(email string) bool {
	return s.emailRegex.MatchString(email);
}

func (s *UserService) hashPassword(password string) ([]byte, error) {
	result, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost);
	if err != nil {
		return nil, fmt.Errorf("hashing password %q: %w", password, err);
	}
	return result, nil
}

func (s *UserService) Signup(
	ctx context.Context,
	email string,
	password string,
	sub *string,
	verified bool,
) (*protos.User, error) {
	if !s.validateEmail(email) {
		return nil, &AuthError {
			Code: protos.AuthErrorCode_EMAIL_MALFORMED,
			Message: "malformed email",
		}
	}

	if !simplePasswordCheck(password) {
		return nil, &AuthError {
			Code: protos.AuthErrorCode_WEAK_PASSWORD,
			Message: "password too weak",
		}
	}
	_, err := s.repo.FindUserByEmail(ctx, email)
	if err == nil {
		return nil, &AuthError {
			Code: protos.AuthErrorCode_EMAIL_ALREADY_EXISTS,
			Message: "email already exists",
		}
	} else if !errors.Is(err, repository.ErrUnknownEmail) {
		return nil, err;
	}

	hashed_password, err := s.hashPassword(password);
	if err != nil {
		return nil, err;
	}

	user := repository.User {
		Sub: sub,
		Email: email,
		Password: hashed_password,
		Verified: verified,	
	};
	err = s.repo.CreateUser(ctx, &user);
	if err != nil {
		return nil, err;
	}

	return &protos.User {
		Id: uuid.UUID(user.Uuid).String(),
		Email: email,
		Verified: verified,
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

