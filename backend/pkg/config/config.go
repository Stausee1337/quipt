package config

import "github.com/kelseyhightower/envconfig"

type Config struct {
	CorsHost string `required:"true" split_words:"true"`
}

func Load() *Config {
	var c Config
	if err := envconfig.Process("quipt", &c); err != nil {
		panic(err);
	}
	return &c;
}

