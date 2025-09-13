package main

import (
	"fmt"
	"net/http"
)

var config GlobalConfig;

func addScore(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "hello\n");
}
	
func corsMiddleware(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Println(config.CorsHost);
		w.Header().Set("Access-Control-Allow-Origin", config.CorsHost);
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization");
		mux.ServeHTTP(w, r);
	});
}


func main() {
	config.ReadAndValidate();

	mux := http.NewServeMux();
	mux.HandleFunc("/add-score", addScore);

	handler := corsMiddleware(mux);

	http.ListenAndServe(":8000", handler);
}
