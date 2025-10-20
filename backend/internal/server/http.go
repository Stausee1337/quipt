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

	authService := service.NewAuthService(cfg, redis)
	userService := service.NewUserService(db)
	scriptsService := service.NewScriptsService(db)

	scriptService := qmodel.CreateScriptService(nil, nil)
	qsrv := qrpc.NewRPCServer(scriptService)

	r.Use(loggingMiddleware);
	r.Use(corsMiddleware(cfg));
	r.Use(authMiddleware(authService));

	signupHandler := handler.NewSignupHandler(userService, authService);
	r.Post("/auth/signup", signupHandler.HandleSignup);
	r.Post("/auth/signin", signupHandler.HandleSignin);
	r.Post("/auth/refresh", signupHandler.HandleRefresh);
	r.Post("/auth/expire", signupHandler.HandleExpire);

	userHandler := handler.NewUserHandler(userService, authService)
	r.Get("/get-user", userHandler.HandleGet)

	scriptsHandler := handler.NewScriptsHanlder(authService, scriptsService)
	r.Get("/list-scripts", scriptsHandler.HandleList)
	r.Get("/script/{ScriptID}", scriptsHandler.HandleGet)
	r.Post("/commit-scores", scriptsHandler.HandleUpdate)
	r.Post("/create-script", scriptsHandler.HandleNew)
	r.Post("/rename-script", scriptsHandler.HandleRename)
	r.Post("/delete-script", scriptsHandler.HandleDelete)
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

