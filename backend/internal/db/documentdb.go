package db

import (
	"context"
	"crypto/tls"
	"fmt"

	"github.com/stausee1337/quipt/pkg/config"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func DocumentDBConnect(cfg *config.Config) *mongo.Client {
	client_options := options.Client();
	connection_uri := fmt.Sprintf(
		"mongodb://%v:%v@%v:%v",
		cfg.DocumentDBUser, cfg.DocumentDBPassword, cfg.DocumentDBHost, cfg.DocumentDBPort)
	client_options.ApplyURI(connection_uri);
	client_options.TLSConfig = &tls.Config { InsecureSkipVerify: true };
	client, err := mongo.Connect(client_options);
	if  err != nil {
		panic(err)
	}
	return client
}

func DocumentDBDisconnect(client *mongo.Client) {
    if err := client.Disconnect(context.Background()); err != nil {
        panic(err)
    }
}

