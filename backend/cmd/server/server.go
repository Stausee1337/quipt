package main

import (
	"github.com/stausee1337/quipt/internal/db"
	"github.com/stausee1337/quipt/internal/server"
	"github.com/stausee1337/quipt/pkg/config"
)

//go:generate go run github.com/stausee1337/qrpc --output-dir ..\..\internal\qmodel ..\..\..\qdefs\script.rpc ..\..\..\qdefs\user.rpc
func main() {
	cfg := config.Load();

	dbClient := db.DocumentDBConnect(cfg);
	defer db.DocumentDBDisconnect(dbClient);

	redisClient := db.RedisConnect(cfg);
	defer db.RedisDisconnect(redisClient);

	srv := server.New(cfg, dbClient, redisClient);
	srv.Run(cfg.ServerHost, cfg.ServerPort);
}

