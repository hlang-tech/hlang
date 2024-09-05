import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import Graph from '../entity/graph';


@Injectable()
export default class NodeService {
  constructor(
    @InjectRepository(Graph) private graphRepository: Repository<Graph>,
    ) {
  }

  async create(graph: Graph, manager?: EntityManager): Promise<Graph> {
    const { flowId } = graph;
    const exists = await this.graphRepository.findOne({
      where: {
        flowId
      },
      order: {
        version: 'DESC'
      },
      cache: true
    });
    graph.version = exists ? exists.version + 1 : 1;
    if (manager) {
      return await manager.save<Graph>(graph);
    }

    return await this.graphRepository.save(graph);
  }

  public async list(flowId: number): Promise<Graph[]> {
    return  await this.graphRepository.find({
      where: { flowId },
      cache: true
    });
  }

  public async getLatest(flowId: number) {
    return await this.graphRepository.findOne({
      where: {
        flowId
      },
      order: {
        version: 'DESC'
      },
      cache: true
    });
  }
}
