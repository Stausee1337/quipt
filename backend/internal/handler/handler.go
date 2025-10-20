package handler

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/stausee1337/quipt/internal/service"
)


type contextKey struct{}
var loggedInUserKey = &contextKey{}

func EnsureAuthorizedMiddleware(auth *service.AuthService) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := auth.GetLoggedInUser(r.Context())
			if claims == nil {
				http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), loggedInUserKey, claims.Uuid)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func LoggedInUser(ctx context.Context) uuid.UUID {
	return ctx.Value(loggedInUserKey).(uuid.UUID)
}

