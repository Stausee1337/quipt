package main

import (
	"fmt"
	"os"
)

type GlobalConfig struct {
	CorsHost string;
}

func (self *GlobalConfig) ReadAndValidate() {
	retreiveVariable("CORS_HOST", &self.CorsHost);
}

func retreiveVariable(name string, value* string) {
	val, ok := os.LookupEnv(name);
	if !ok {
		fmt.Fprintf(os.Stderr, "environment variable '%s' not set\n", name);
		os.Exit(1);
	}
	*value = val;
}

