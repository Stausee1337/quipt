package server

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/stausee1337/quipt/pkg/config"
)

type StatusWrapper struct {
	writer http.ResponseWriter
	status int
}

func (w *StatusWrapper) Header() http.Header {
	return w.writer.Header();
}

func (w *StatusWrapper) Write(data []byte) (int, error) {
	return w.writer.Write(data);
}

func (w *StatusWrapper) WriteHeader(code int) {
	w.writer.WriteHeader(code);
	w.status = code
}

func loggingMiddleware(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			wrapper := StatusWrapper { writer: w, status: http.StatusOK };
			next.ServeHTTP(&wrapper, r);
			slog.Info(fmt.Sprintf("%v %v [%v]", r.Method, r.URL.Path, wrapper.status));
		});
	};

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
