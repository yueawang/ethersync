# README #
## What is this repository for? ##

sync and watch ethereum block information to map transactions by address

## Who do I talk to? ##

* Jivin Shen:jivin.shen@gmail.com

## Setup ##
### Setup geth ###
```
sudo add-apt-repository -y ppa:ethereum/ethereum
sudo apt-get update
sudo apt-get install ethereum
geth --testnet  --rpc --rpcaddr 0.0.0.0 --rpcport 8100 --rpcapi personal,db,eth,net,web3,miner --nodiscover   console
```
and then you will enter 'geth' console with below outputs
```
Maximum peer count                       ETH=25 LES=0 total=25
Starting peer-to-peer node               instance=Geth/v1.8.2-stable-b8b9f7f4/linux-amd64/go1.9.4
Allocated cache and file handles         database=/home/jivin/.ethereum/testnet/geth/chaindata cache=768 handles=512
Persisted trie from memory database      nodes=355 size=65.25kB time=360.65µs gcnodes=0 gcsize=0.00B gctime=0s livenodes=1 livesize=0.00B
Initialised chain configuration          config="{ChainID: 3 Homestead: 0 DAO: <nil> DAOSupport: true EIP150: 0 EIP155: 10 EIP158: 10 Byzantium: 1700000 Constantinople: <nil> Engine: ethash}"
Disk storage enabled for ethash caches   dir=/home/jivin/.ethereum/testnet/geth/ethash count=3
Disk storage enabled for ethash DAGs     dir=/home/jivin/.ethash                       count=2
Initialising Ethereum protocol           versions="[63 62]" network=3
Loaded most recent local header          number=2 hash=a9e607…0b2a20 td=3030716
Loaded most recent local full block      number=2 hash=a9e607…0b2a20 td=3030716
Loaded most recent local fast block      number=2 hash=a9e607…0b2a20 td=3030716
Loaded local transaction journal         transactions=0 dropped=0
Regenerated local transaction journal    transactions=0 accounts=0
Blockchain not empty, fast sync disabled 
Starting P2P networking 
HTTP endpoint opened                     url=http://0.0.0.0:8100 cors= vhosts=localhost
RLPx listener up                         self="enode://30c878d39d95af2429d2fcb3d17a51eeca3a3f039dc4144a2ac374df7c9ef4c4dbed7ce624c43bfbc208d119f0a6f6f566f3afeddf5f61418ccecd7d08397f36@[::]:30303?discport=0"
IPC endpoint opened                      url=/home/jivin/.ethereum/testnet/geth.ipc
Welcome to the Geth JavaScript console!

instance: Geth/v1.8.2-stable-b8b9f7f4/linux-amd64/go1.9.4
INFO [04-10|17:49:02] Etherbase automatically configured       address=0x8d846Df452507cF89769884eDB2973051e4b6147
coinbase: 0x8d846df452507cf89769884edb2973051e4b6147
at block: 2 (Tue, 10 Apr 2018 16:33:54 CST)
 datadir: /home/jivin/.ethereum/testnet
 modules: admin:1.0 debug:1.0 eth:1.0 miner:1.0 net:1.0 personal:1.0 rpc:1.0 txpool:1.0 web3:1.0

> 
```
_**Please remember above ipc path '/home/jivin/.ethereum/testnet/geth.ipc' which will be used behind**_

Create acount and start to miner
```
﻿> personal.newAccount()
Passphrase: 
Repeat passphrase: 
"0x8d846df452507cf89769884edb2973051e4b6147"
> miner.start()
```
### Setup mysql and nodejs ###

```
sudo apt-get install mysql-server
sudo apt-get install curl
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
```
### Setup ethersync ###

````
git clone https://github.com/UniWallet/ethersync.git
cd ethersync
export YIYA_CONFIG_NAME=test
#need input mysql password
./setupdb.sh
````
'setupdb.sh' script will create some tables in database 'ethdb_test' like below

```
mysql> use ethdb_test;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
mysql> show tables;
+----------------------+
| Tables_in_ethdb_test |
+----------------------+
| alias                |
| ethblock             |
| ethblock_0           |
| ethblock_new         |
| ethtx                |
| ethtx_0              |
| ethtx_new            |
| exrate               |
| token                |
| wallet               |
| walletalias          |
+----------------------+
11 rows in set (0.00 sec)

```
Then edit configuration file ---config.js

modify ipc file path and database host for `testnet` like below patch

```
﻿--- a/config.js
+++ b/config.js
@@ -12,13 +12,13 @@ var configList = {
     },
     test: {
         db: {
-            host: 'test.yiya.io',
+            host: 'localhost',
             user: 'test',
             password: 'yiya',
             database: 'ethdb_test'
         },
         sqlMrgFile:"/data/d01/mysql/ethdb_test/ethtx.MRG",
-        gethipc: parentDir + "/geth/data/00/geth.ipc"
+        gethipc: "/home/jivin/.ethereum/testnet/geth.ipc"
     },
     ropsten: {
         db: {

```
_**Change 'host' to 'localhost' and give correct ipc path**_

## Run ##
```
export YIYA_CONFIG_NAME=test
npm install
npm start
```
It costs much time to drag a block, so just wait when you see below log
```
#'netnum:0' means testnet has zero block currently
dbnum:-1 netnum:0
```
When one block is dragged, you can see block and transactions data in table 'ethblock', 'ethtx'
