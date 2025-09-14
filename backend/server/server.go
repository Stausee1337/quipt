package server

import (
	"fmt"
	"net/http"
	pb "github.com/stausee1337/quipt/protos"
	"google.golang.org/protobuf/proto"
)


var config ServerConfig;

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
	
func corsMiddleware(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", config.CorsHost);
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization");
		mux.ServeHTTP(w, r);
	});
}

func Serve() {
	config.ReadAndValidate();

	mux := http.NewServeMux();
	mux.HandleFunc("/add-score", addScore);

	handler := corsMiddleware(mux);

	http.ListenAndServe(":8000", handler);
}

