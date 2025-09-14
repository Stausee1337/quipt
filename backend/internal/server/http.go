package server

import (
	"fmt"
	"io"
	"net/http"
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/stausee1337/quipt/internal/service"
	"github.com/stausee1337/quipt/pkg/config"
	"github.com/stausee1337/quipt/protos"
	pb "github.com/stausee1337/quipt/protos"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"google.golang.org/protobuf/proto"
)

type Server struct {
	router http.Handler
	config config.Config
}

type SignupHandler struct {
	svc *service.UserService
}

func NewSignupHandler(db *mongo.Database) *SignupHandler {
	return &SignupHandler {
		svc: service.NewUserService(db),
	};
}

func (h *SignupHandler) HandleSignup(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body);
	if err != nil {
		slog.Error(err.Error());
		http.Error(w, "internal server error", http.StatusInternalServerError);
		return
	}
	defer r.Body.Close()

	var req protos.SignupRequest
	if err = proto.Unmarshal(body, &req); err != nil {
		slog.Error(err.Error());
		w.WriteHeader(http.StatusBadRequest);
		return;
	}

	ctx := r.Context()

	var response []byte

	user, err := h.svc.Signup(ctx, req.Email, req.Password, nil, false)
	if err != nil {
		auth, ok := err.(*service.AuthError);
		if !ok {
			slog.Error(err.Error());
			http.Error(w, "internal server error", http.StatusInternalServerError);
			return
		}
		response, err = proto.Marshal(&protos.AuthError {
			Code: auth.Code,
			Message: auth.Message,
		});
		if err != nil {
			slog.Error(err.Error());
			http.Error(w, "internal server error", http.StatusInternalServerError);
			return
		}
		w.WriteHeader(http.StatusBadRequest);
	} else {
		response, err = proto.Marshal(user);
		if err != nil {
			slog.Error(err.Error());
			http.Error(w, "internal server error", http.StatusInternalServerError);
		}
	}

	w.Write(response)
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

func New(cfg *config.Config, documentdb *mongo.Client) *Server {
	r := chi.NewRouter();
	db := documentdb.Database("quipt");

	r.Use(loggingMiddleware);
	r.Use(corsMiddleware(cfg));

	r.Get("/add-score", addScore);
	signup_handler := NewSignupHandler(db);
	r.Post("/auth/signup", signup_handler.HandleSignup);

	return &Server{router: r};
}

func (s *Server) Run(host string, port uint16) {
	slog.Info(fmt.Sprintf("Serving at http://%v:%v", host, port));
	err := http.ListenAndServe(fmt.Sprintf("%v:%v", host, port), s.router);
	if err != nil {
		panic(err);
	}
}

