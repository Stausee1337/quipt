package config

import "github.com/kelseyhightower/envconfig"

type Config struct {
	CorsHost 			string `required:"true" split_words:"true"`
	DocumentDBUser 		string `required:"true" split_words:"true"`
	DocumentDBPassword 	string `required:"true" split_words:"true"`
	DocumentDBHost 		string `required:"true" split_words:"true"`
	DocumentDBPort 		string `required:"true" split_words:"true"`
}

func Load() *Config {
	var c Config
	if err := envconfig.Process("quipt", &c); err != nil {
		panic(err);
	}
	return &c;
}

