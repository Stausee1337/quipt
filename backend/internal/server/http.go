package server

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"
	"github.com/stausee1337/quipt/internal/handler"
	"github.com/stausee1337/quipt/internal/service"
	"github.com/stausee1337/quipt/pkg/config"
	pb "github.com/stausee1337/quipt/protos"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"google.golang.org/protobuf/proto"
)

type Server struct {
	router http.Handler
	config config.Config
}


func addScore(w http.ResponseWriter, r *http.Request) {
	Actor := "Bär";
	queue := pb.TextCue {
		Text: "Hallo, Welt",
		Actor: &Actor,
	};
	data, error := proto.Marshal(&queue);
	if error != nil {
		w.WriteHeader(500);
		fmt.Fprintln(w, "internal server error");
	}
	w.Write(data);
}

func New(cfg *config.Config, documentdb *mongo.Client, redis *redis.Client) *Server {
	r := chi.NewRouter();
	db := documentdb.Database("quipt");

	authService := service.NewAuthService(cfg, redis)
	userService := service.NewUserService(db)

	r.Use(loggingMiddleware);
	r.Use(corsMiddleware(cfg));
	r.Use(authMiddleware(authService));

	r.Get("/add-score", addScore);
	signup_handler := handler.NewSignupHandler(userService, authService);
	r.Post("/auth/signup", signup_handler.HandleSignup);
	r.Post("/auth/signin", signup_handler.HandleSignin);
	r.Post("/auth/refresh", signup_handler.HandleRefresh);
	r.Post("/auth/expire", signup_handler.HandleExpire);

	return &Server{router: r};
}

func (s *Server) Run(host string, port uint16) {
	slog.Info(fmt.Sprintf("Serving at http://%v:%v", host, port));
	err := http.ListenAndServe(fmt.Sprintf("%v:%v", host, port), s.router);
	if err != nil {
		panic(err);
	}
}

