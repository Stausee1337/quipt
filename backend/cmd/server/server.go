package main

import "github.com/stausee1337/quipt/pkg/config"
import "github.com/stausee1337/quipt/internal/server"

//go:generate protoc --go_opt=paths=source_relative --go_out=../../protos --proto_path=../../../protos ../../../protos/main.proto ../../../protos/auth.proto ../../../protos/scripts.proto
func main() {
	cfg := config.Load();
	srv := server.New(cfg);
	srv.Run();
}

