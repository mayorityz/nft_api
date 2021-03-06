import Web3 from 'web3'
import Deployment, { Minting } from './smart.model.js'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const artifact = require('../../build/contracts/MyNFT.json')

// let web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))

export const deployment = async (req, res) => {
  let deployerAddress = '0x1ab31Fd47c3DF0747121e2dc12193a1758dcd600'
  let deployerPrivKey =
    'bbf4f2fd2615abb23f43aac986964338cca0585cc0933ce1662d92cb93897e3c'

  try {
    let bytecode = artifact.bytecode
    let abi = artifact.abi

    const web3 = new Web3('http://127.0.0.1:7545')

    const incrementer = new web3.eth.Contract(abi)

    const incrementerTx = incrementer.deploy({
      data: bytecode,
    })
    const createTransaction = await web3.eth.accounts.signTransaction(
      {
        from: deployerAddress,
        data: incrementerTx.encodeABI(),
        gas: 3000000,
      },
      deployerPrivKey,
    )
    web3.eth
      .sendSignedTransaction(createTransaction.rawTransaction)
      .then((res_) => {
        console.log('Contract deployed at address', res_.contractAddress)
        // save contract address to DB

        let newRecord = new Deployment({
          contractAddress: res_.contractAddress,
          deployerAddress,
        })
        newRecord.save()

        res.status(200).json({ message: res_.contractAddress })
      })
  } catch (error) {
    res.status(500).json({ contractAddress: error.message })
  }
}

export const Mint = async (req, res) => {
  try {
    const { address, contractAddress } = req.body

    console.log(`address : ${address}`)
    console.log(`contract address : ${contractAddress}`)

    //   make calls the contract address
    const web3 = new Web3('http://127.0.0.1:7545')
    let Contract = new web3.eth.Contract(artifact.abi, contractAddress)

    //! fetch the estimated gas in some cases

    await Contract.methods
      .mintNFT(
        address,
        'https://images.launchbox-app.com/87c85520-878a-445e-9e93-e912c8bb08a.jpg',
      )
      .send(
        {
          from: '0x1ab31Fd47c3DF0747121e2dc12193a1758dcd600',
          gas: '173859',
          gasLimit: '173859',
        },
        (err, txHash) => {
          if (err) res.status(500).json({ err: err.message })
          else {
            let newMintRecord = new Minting({
              toAddress: address,
              refContract: contractAddress,
              txHash,
            })
            newMintRecord.save((er, result) => {
              if (er) {
                console.log(er)
              } else {
                console.log(result)
                res.status(200).json({ nftID: txHash })
              }
            })
          }
          //   save the txHash to the DB.
        },
      )
  } catch (error) {
    res.status(500).json({ err: error.message })
  }
}
