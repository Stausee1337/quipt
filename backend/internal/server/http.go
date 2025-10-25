package server

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"
	"github.com/stausee1337/qrpc/qrpc"
	"github.com/stausee1337/quipt/internal/handler"
	"github.com/stausee1337/quipt/internal/qmodel"
	"github.com/stausee1337/quipt/internal/service"
	"github.com/stausee1337/quipt/pkg/config"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Server struct {
	router http.Handler
	config config.Config
}

func New(cfg *config.Config, documentdb *mongo.Client, redis *redis.Client) *Server {
	r := chi.NewRouter();
	db := documentdb.Database("quipt");

	userService := service.NewUserService(db)
	authService := service.NewAuthService(cfg, redis, userService)
	scriptsService := service.NewScriptsService(db)

	authHandler := qmodel.CreateAuthService(
		handler.NewAuthHandler(authService),
	)

	userHandler := qmodel.CreateUserService(
		handler.NewUserHandler(userService),
	)
	userHandler.Use(handler.EnsureAuthorizedMiddleware(authService));

	scriptHandler := qmodel.CreateScriptService(
		handler.NewScriptHandlers(scriptsService),
	)
	scriptHandler.Use(handler.EnsureAuthorizedMiddleware(authService));

	divisionHandler := qmodel.CreateDivisionService(
		handler.NewDivisionHandler(scriptsService),
	)
	divisionHandler.Use(handler.EnsureAuthorizedMiddleware(authService));

	cueHandler := qmodel.CreateCueService(
		handler.NewCueHandler(scriptsService),
	)
	cueHandler.Use(handler.EnsureAuthorizedMiddleware(authService));

	qsrv := qrpc.NewRPCServer(
		authHandler,
		userHandler,
		scriptHandler,
		divisionHandler,
		cueHandler,
	)
	qsrv.SetLogger(slog.Default());

	r.Use(loggingMiddleware);
	r.Use(corsMiddleware(cfg));
	r.Use(authMiddleware(authService));

	r.Mount("/qrpc", qsrv)

	return &Server{router: r};
}

func (s *Server) Run(host string, port uint16) {
	slog.Info(fmt.Sprintf("Serving at http://%v:%v", host, port));
	err := http.ListenAndServe(fmt.Sprintf("%v:%v", host, port), s.router);
	if err != nil {
		panic(err);
	}
}

