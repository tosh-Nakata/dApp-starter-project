//サイトの表側を司るコード
import React, {useEffect, useState} from "react";
import { ethers } from "ethers";
import './App.css';
import abi from "./utils/WavePortal.json";

const App = () => {
  // ユーザーのパブリックウォレットを保存するために使用する状態変数を定義する
  //currentAccountという変数をsetCurrentAccountという関数を使って変えますよという宣言
  //{x}で値を支える
  const [currentAccount, setCurrentAccount] = useState("");
  console.log("currentAccount: ", currentAccount);
  const [messageValue, setMessageValue] = useState("")
  const [allWaves, setAllWaves] = useState([]);
  const contractAddress = "0xde2B49292bB9DAAd8e52E63FF5B756a395d86141";
  const contractABI = abi.abi;
  const getAllWaves = async () => {
    const {ethereum} = window;

    try {
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
        
        //コントラクトからgetAllWavesメソッドを呼び出す
        const waves = await wavePortalContract.getAllWaves();
        //UIに必要な三つの情報を以下のように設定
        const wavesCleaned = waves.map(wave => {
          return {
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000), 
            message: wave.message,
          };
        });
        setAllWaves(wavesCleaned);
      } else {
        console.log("Ethereum object doesn't exist!!");        
      }
    } catch (error) {
      console.log(error);
    }
  };


  const checkIfWalletIsConnected = async () => { 
    //window.ethereumにアクセスできることを確認する
    try {
    const {ethereum} = window;
    if (!ethereum) {
      console.log("Make sure you have MetaMask!");
      return;
    } else {
      console.log("We have the ethereum object", ethereum); 
    }
    //ユーザーのウォレットへのアクセス許可を確認
    const accounts = await ethereum.request({ method: "eth_accounts" }); 
    if (accounts.length !==  0) {
      const account = accounts[0]; 
      console.log("Found an authorized account:", account);
      setCurrentAccount(account)
    } else {
      console.log("No authorized account found")
    }
  } catch (error) {
    console.log(error);
  }
};

//emitされたイベントに反応する
useEffect(() => {
  let wavePortalContract;

  const onNewWave = (from, timestamp, message) =>  {
    console.log("NewWave", from, timestamp, message);
    setAllWaves(prevState => [
      ...prevState,
      {
        address: from,
        timestamp: new Date(timestamp * 1000),
        message: message,
      },
    ]);
  };

  //newWaveイベントがコントラクトから発信された時情報を受け取る
  if (window.ethereum) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
    wavePortalContract.on("NewWave", onNewWave);
  }
  //メモリリークを防ぐためにnewWaveのイベントを解除します
  return () => {
    if (wavePortalContract) {
      wavePortalContract.off("NewWave", onNewWave);
    }
  };
}, []);

//connectWallet メソッドの実装
const connectWallet = async () => {
  try {
    const {ethereum} = window;
    if (!ethereum) {
      alert("Get MetaMask!");
      return;
    }
    const accounts = await ethereum.request({method: "eth_requestAccounts"});
    console.log("Connected: ", accounts[0]);
    setCurrentAccount(accounts[0]);    
  } catch (error) {
    console.log(error)
  }
}

//waveの回数をカウントする関数を実装
const wave = async() => {
  try {
    const {ethereum} = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const wavePortalContract = new ethers.Contract(contractAddress,  contractABI, signer);
      let count = await wavePortalContract.getTotalWaves();
      let contractBalance = await provider.getBalance( 
        wavePortalContract.address);
        console.log(
          "Contract balance:", 
          ethers.utils.formatEther(contractBalance)
        );
      console.log("Retrieved total wave count...", count.toNumber());
      console.log("Signer:",signer);    
      //コントラクトにwaveを書き込む
      const waveTxn = await wavePortalContract.wave(messageValue, {gasLimit:300000});
      console.log("Mining...", waveTxn.hash);
      await waveTxn.wait();
      console.log("Minted --", waveTxn.hash);
      count = await wavePortalContract.getTotalWaves();
      console.log("Retrieved total wave count ...", count.toNumber()) ;
      let contractBalance_post = await provider.getBalance(wavePortalContract.address);
      if (contractBalance_post < contractBalance){
        console.log("User won ETH!");
      } else {
        console.log("User didn't win Eth.");
      }
      console.log(
        "contract balance after wave",
        ethers.utils.formatEther(contractBalance_post)
      );
    } else {
      console.log("Ethereum object doesn't exist!");
    }
  } catch (error) {
  console.log(error)
  } 
}
  
// webページがロードされた時、実行する関数
  useEffect(() => {
    checkIfWalletIsConnected();  
  }, []) 
  return (
    <div className="mainContainer">
      <div className="dataContainer">
        <div className="header">
          <span role="img" aria-label="hand-wave">👋</span> WELCOME!!
        </div>
        <div className="bio">
          イーサリウムウォレットを接続して、「<span role="img" aria-label="hand-wave">👋</span>(wave)を送ってください<span role="img" aria-label="shine">✨</span>
        </div>
        <button className="waveButton" onClick={wave}>
          Wave at Me
        </button>
        {/* ウォレットコネクトボタンの実装*/}
        {!currentAccount &&  (
          <button className="waveButton" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
        {currentAccount && (
          <button className="waveButton" onClick={connectWallet}>
            Wallet Connected
          </button>
        )}
        {/*メッセージボックスを実装 */}
        {currentAccount && (<textarea name="messageArea"
        placeholder="メッセージはこちら"
        type="text"
        id="message"
        value={messageValue}
        onChange={e => setMessageValue(e.target.value)}/>)}
        {/*履歴を表示する*/}
        {currentAccount && (
          allWaves.slice(0).reverse().map((wave, index) => {
            return (
              <div key={index} style={{ backgroundColor: "#F8F8FF", marginTop: "16px", padding: "8px"}}>
                <div>Address: {wave.address}</div>
                <div>Time: {wave.timestamp.toString()}</div>
                <div>Message: {wave.message}</div>
                </div>
            )
          })
        )}
      </div>
    </div>
  );
}
export default App


// export default function App() {

//   const wave = () => {

//   }

//   return (
//     <div className="mainContainer">

//       <div className="dataContainer">
//         <div className="header">
//         <span role="img" aria-label="hand-wave">👋</span> WELCOME!
//         </div>

//         <div className="bio">
//         イーサリアムウォレットを接続して、メッセージを作成したら、<span role="img" aria-label="hand-wave">👋</span>を送ってください<span role="img" aria-label="shine">✨</span>
//         </div>

//         <button className="waveButton" onClick={wave}>
//         Wave at Me
//         </button>
//       </div>
//     </div>
//   );
// }
