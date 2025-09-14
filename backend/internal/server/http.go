package server

import (
	"fmt"
	"net/http"
	"github.com/go-chi/chi/v5"
	"github.com/stausee1337/quipt/pkg/config"
	pb "github.com/stausee1337/quipt/protos"
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

func New(cfg *config.Config) *Server {
	r := chi.NewRouter();

	r.Use(corsMiddleware(cfg));

	r.Get("/add-score", addScore);

	return &Server{router: r};
}

func (s *Server) Run() {
	http.ListenAndServe(":8000", s.router);
}

