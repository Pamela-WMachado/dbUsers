module.exports = function (app) {

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pg = require('pg');
const bodyparser = require('body-parser');
const cors = require('cors');


app.use(express.urlencoded({ extended: false })); 
app.use(express.json());

var conString = 'postgres://kuywuubmcnqtwf:d791c6ae3aaf567d7f047819791a7001182f0c902014cd9c784fcc9ce7828924@ec2-54-211-255-161.compute-1.amazonaws.com:5432/dc69luirutt0ns';
    const pool = new pg.Pool({connectionString: conString, ssl: {rejectUnauthorized: false}});

    //rota principal - teste de rota
app.get('/', (req, res) => {
    pool.connect((err, client, release) => {
        if (err) {
            return res.status(401).send('Não foi possível conectar')
        }
        res.status(200).send('Conectado com sucesso')
    })
})

//cadastrar
app.post('/usuarios', (req, res) => {
    pool.connect((err, client, release) => {
        if (err) {
            return res.status(401).send('Conexão nao autorizada')
        }

        client.query('select * from usuarios where cpf = $1', [req.body.cpf], (error, result) => {
            if (error) {
                release();
                return res.status(401).send('Operação não autorizada')
            }

            if (result.rowCount > 0) {
                release();
                return res.status(200).send('Usuário já cadastrado')
            }
            bcrypt.hash(req.body.senha, 10, (error, hash) => {
                if (error) {
                    release();
                    return res.status(500).send({
                        message: 'Erro de autenticação',
                        erro: error.message
                    })
                }
                var sql = 'INSERT INTO usuarios (nome, email, senha, cpf, fone, cep, estado, cidade, bairro, rua, numero, complemento, perfil) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)';
                var valores = [req.body.nome, req.body.email, hash, req.body.cpf, req.body.fone, req.body.cep, req.body.estado, req.body.cidade, req.body.bairro, req.body.rua, req.body.numero, req.body.complemento, req.body.perfil];

                client.query(sql, valores, (error, result) => {
                    if (error) {
                        return res.status(403).send(error);
                    }
                    if (result) {
                        release();
                        res.status(201).send({
                            mensagem: 'Usuário cadastrado com sucesso',
                            status: 201
                        })
                        
                    }
                })
            })
        })
    })
})


//listando perfis cadastrados
app.get('/usuarios', (req, res) => {
    pool.connect((err, client, release) => {
        if (err) {
           return res.status(401).send('Conexão não autorizada')
        }

        client.query('select * from usuarios', (error, result) => {
            if (error) {
                release();
                return res.status(401).send('Operação não autorizada')
            }
            release();
             return res.status(200).send(result.rows)
        })
    })
})

//consulta de perfis por id
app.get('/usuarios/:id', (req, res) => {
    pool.connect((err, client, release) => {
        if (err) {
            return res.status(401).send('Conexão não autorizada')
        }
        client.query('select * from usuarios where id = $1', [req.params.id], (error, result) => {
            if (error) {
                release();
                return res.status(401).send('Operação não autorizada')
            }
            release();
            res.status(200).send(result.rows[0])
        })
    })
})


//update
app.put('/usuarios/:id', (req, res) => {
    pool.connect((err, client, release) => {
        if (err) {
            return res.status(401).send('Conexão não autorizada')

        }
        client.query('select * from usuarios where id=$1', [req.params.id], (error, result) => {
            if (error) {
                release();
                return res.status(401).send('Operação não permitida')
            }

            //update usuarios set nome=$1, email =$2, senha=$3, cpf=$4, fone=$5, cep=$6, pais=$7, estado=$8, cidade=$9, bairro=$10, rua=$11, numero=$12, complemento=$13, perfil=$14
            if (result.rowCount > 0) {
                release();
                var sql = 'update usuarios set nome=$1, email=$2, senha=$3, cpf=$4, fone=$5, cep=$6, estado=$7, cidade=$9, bairro=$10, rua=$11, numero=$12, complemento=$13, perfil=$14 where id=$15'
                let valores = [req.body.nome, req.body.email, req.body.senha, req.body.cpf, req.body.fone, req.body.cep, req.body.estado, req.body.cidade, req.body.bairro, req.body.rua, req.body.numero, req.body.complemento, req.body.perfil, req.params.id];

                client.query(sql, valores, (error2, result2) => {
                    if (error2) {
                        release();
                        return res.status(401).send(error2)
                    }

                    if (result2.rowCount > 0) {
                        release();
                        return res.status(200).send('Dados alterados com sucesso')
                    }
                })
            } else {
                release();
                res.status(200).send('Usuário não encontrado')
            }

        })
    })
})

//metodo deletar
app.delete('/usuarios/:id', (req, res) => {
    pool.connect((err, client, release) => {
        if (err) {
            return res.status(401).send('Conexão não autorizada')
        }

        client.query('delete from usuarios where id = $1', [req.params.id], (error, result) => {

            if (error) {
                release();
                return res.status(401).send('Operação não autorizada')
            }
            res.status(200).send({
                message: 'Usuário excluído com sucesso'
            })
        })
    })
})


//login
app.post('/usuarios/login', (req, res) => {
    //res.status(200).send('buscar usuário')
    pool.connect((err, client, release) => {
        if (err) {
            return res.status(401).send("Conexão não autorizada")
        }
        client.query(' select * from usuarios where email = $1', [req.body.email], (error, result) => {
            if (error) {
                release();
                return res.status(401).send('operação nao permitida')
            }
            if (result.rowCount > 0) {
                //release();
                //criptografar a senha enviada e comparar com a recuperada
                bcrypt.compare(req.body.senha, result.rows[0].senha, (error, results) => {
                    if (results) {
                        //release();
                        let token = jwt.sign({
                                email: result.rows[0].email,
                                perfil: result.rows[0].perfil
                            },
                            process.env.JWTKEY, {
                                expiresIn: '1h'
                            })
                            release();
                            return res.status(200).send({
                            message: 'Conectado com sucesso',
                            token: token
                        })
                    }
                    else {
                        release();
                        return res.status(401).send({
                            message: "Falha na autenticação. Senha incorreta."
                        })
                    }
                })
                    } 
                    else {
                        release();
                        return res.status(200).send({
                        message: 'Usuário não encontrado'
                })
            }
        })
    })
})

}