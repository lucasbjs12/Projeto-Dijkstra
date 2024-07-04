const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();
const PORT = 5500;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Definição da rota para servir a página HTML
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Definição da rota para lidar com a busca do caminho mais barato
app.post("/buscar", (req, res) => {
  const origem = req.body.origem;
  const destino = req.body.destino;
  const precoCombustivel = parseFloat(req.body.precoCombustivel);
  const autonomia = parseFloat(req.body.autonomia);

  if (!origem || !destino || isNaN(precoCombustivel) || isNaN(autonomia)) {
    return res.status(400).json({ error: "Forneça todos os parâmetros necessários" });
  }

  const resultado = grafo.dijkstra(origem, destino, precoCombustivel, autonomia);
  if (!resultado) {
    return res.status(404).json({ error: "Rota inexistente entre as capitais fornecidas" });
  }

  res.json(resultado);
});

app.listen(PORT, () => {
  seedGrafo();
  console.log("Servidor rodando na porta " + PORT);
});

class Grafo {
  constructor() {
    this.vertices = new Map();
  }

  adicionarVertice(vertice) {
    if (!this.vertices.has(vertice)) {
      this.vertices.set(vertice, { toll: 0, adjacentes: new Map() });
    }
  }

  adicionarAresta(vertice1, vertice2, distancia) {
    if (this.vertices.has(vertice1) && this.vertices.has(vertice2)) {
      this.vertices.get(vertice1).adjacentes.set(vertice2, distancia);
      this.vertices.get(vertice2).adjacentes.set(vertice1, distancia);
    }
  }

  mostrarVerticesAdjacentes() {
    for (const [vertice, { adjacentes }] of this.vertices) {
      console.log(`Os vértices adjacentes de ${vertice} são: ${Array.from(adjacentes.keys()).join(", ")}`);
    }
  }

  dijkstra(origem, destino, precoCombustivel, autonomia) {
    const distancias = new Map();
    const custos = new Map();
    const anteriores = new Map();
    const visitados = new Set();
    const heap = new MinHeap();

    this.vertices.forEach((_, vertice) => {
      distancias.set(vertice, Infinity);
      custos.set(vertice, Infinity);
    });
    distancias.set(origem, 0);
    custos.set(origem, 0);
    heap.insert({ vertice: origem, custo: 0 });

    while (!heap.isEmpty()) {
      const { vertice: atual, custo: custoAtual } = heap.extractMin();
      if (visitados.has(atual)) continue;
      visitados.add(atual);

      if (atual === destino) break;

      for (const [vizinho, distancia] of this.vertices.get(atual).adjacentes) {
        if (visitados.has(vizinho)) continue;

        const toll = this.vertices.get(vizinho).toll;
        const custoCombustivel = (distancia / autonomia) * precoCombustivel;
        const novoCusto = custoAtual + custoCombustivel + toll;

        if (novoCusto < custos.get(vizinho)) {
          custos.set(vizinho, novoCusto);
          distancias.set(vizinho, distancias.get(atual) + distancia);
          anteriores.set(vizinho, atual);
          heap.insert({ vertice: vizinho, custo: novoCusto });
        }
      }
    }

    if (!anteriores.has(destino)) {
      return null;
    }

    const caminho = [];
    let atual = destino;
    while (anteriores.has(atual)) {
      caminho.unshift(atual);
      atual = anteriores.get(atual);
    }
    caminho.unshift(origem);

    return {
      caminho,
      custo: custos.get(destino),
    };
  }
}

class MinHeap {
  constructor() {
    this.heap = [];
  }

  insert(element) {
    this.heap.push(element);
    this.heapifyUp();
  }

  extractMin() {
    if (this.heap.length === 1) {
      return this.heap.pop();
    }
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.heapifyDown();
    return min;
  }

  heapifyUp() {
    let index = this.heap.length - 1;
    while (index > 0) {
      const element = this.heap[index];
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];

      if (parent.custo <= element.custo) break;

      this.heap[index] = parent;
      this.heap[parentIndex] = element;
      index = parentIndex;
    }
  }

  heapifyDown() {
    let index = 0;
    const length = this.heap.length;
    const element = this.heap[0];

    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let leftChild, rightChild;
      let swap = null;

      if (leftChildIndex < length) {
        leftChild = this.heap[leftChildIndex];
        if (leftChild.custo < element.custo) {
          swap = leftChildIndex;
        }
      }

      if (rightChildIndex < length) {
        rightChild = this.heap[rightChildIndex];
        if (
          (swap === null && rightChild.custo < element.custo) ||
          (swap !== null && rightChild.custo < leftChild.custo)
        ) {
          swap = rightChildIndex;
        }
      }

      if (swap === null) break;

      this.heap[index] = this.heap[swap];
      this.heap[swap] = element;
      index = swap;
    }
  }

  isEmpty() {
    return this.heap.length === 0;
  }
}

const grafo = new Grafo();

function seedGrafo() {
  const data = fs.readFileSync("./capitais.json", "utf8");
  const capitais = JSON.parse(data);

  capitais.forEach((capital) => {
    const [nome, detalhes] = Object.entries(capital)[0];
    grafo.adicionarVertice(nome);
    grafo.vertices.get(nome).toll = detalhes.toll;

    for (const [vizinho, distancia] of Object.entries(detalhes.neighbors)) {
      grafo.adicionarVertice(vizinho);
      grafo.adicionarAresta(nome, vizinho, distancia);
    }
  });

  grafo.mostrarVerticesAdjacentes();
}


