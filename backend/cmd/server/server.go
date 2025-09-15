package main

import (
	"github.com/stausee1337/quipt/internal/db"
	"github.com/stausee1337/quipt/internal/server"
	"github.com/stausee1337/quipt/pkg/config"
)

//go:generate protoc --go_opt=paths=source_relative --go_out=../../protos --proto_path=../../../protos ../../../protos/main.proto ../../../protos/auth.proto ../../../protos/scripts.proto
func main() {
	cfg := config.Load();

	dbClient := db.DocumentDBConnect(cfg);
	defer db.DocumentDBDisconnect(dbClient);

	redisClient := db.RedisConnect(cfg);
	defer db.RedisDisconnect(redisClient);

	srv := server.New(cfg, dbClient, redisClient);
	srv.Run("localhost", 8000);
}

