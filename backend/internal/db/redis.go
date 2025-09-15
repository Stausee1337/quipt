package db

import (
	"fmt"

	"github.com/redis/go-redis/v9"
	"github.com/stausee1337/quipt/pkg/config"
)

func RedisConnect(cfg *config.Config) *redis.Client {
    rdb := redis.NewClient(&redis.Options{
        Addr:     fmt.Sprintf("%v:%v", cfg.RedisHost, cfg.RedisPort),
        Password: "", // no password set
        DB:       0,  // use default DB
    })
	return rdb
}

func RedisDisconnect(client *redis.Client) {
	if err := client.Close(); err != nil {
		panic(err)
	}
}

