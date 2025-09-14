package main

import "github.com/stausee1337/quipt/server"

//go:generate protoc --go_opt=paths=source_relative --go_out=../../protos --proto_path=../../../protos ../../../protos/main.proto ../../../protos/auth.proto ../../../protos/scripts.proto
func main() {
	server.Serve();
}

