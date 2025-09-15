package handler

import (
	"log/slog"
	"net/http"
)

func logFatalAndReport(w http.ResponseWriter, err error) {
	slog.Error(err.Error())
	http.Error(w, "internal server error", http.StatusInternalServerError)
}


