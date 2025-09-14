package server

import (
	"net/http"
	"github.com/stausee1337/quipt/pkg/config"
)

func corsMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", cfg.CorsHost);
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization");
			next.ServeHTTP(w, r);
		});
	};
}
