import { FC, useEffect, useRef } from "react";
import styled from "@emotion/styled";
import { v4 } from "uuid";

import { PBT, ServerBatch, Batch } from "./models";
import { Playground } from "./components/playground";
import { Client, useClient } from "./use-client";
import { last } from "./util";

const Row = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #252526;
  padding: 20px;
`;

const handleEffect = (
  client: Client,
  otherClient: Client,
  serverLog: React.MutableRefObject<Batch<PBT>[]>
) => {
  const updates = client.isSyncDragEnabled
    ? client.uState.stateUpdates.filter((update) => !update.skipState)
    : client.uState.stateUpdates.filter((update) => !update.skipHistory);
  if (updates.length) {
    const batch: Batch<PBT> = {
      updates,
      id: v4(),
    };
    client.log.current.push(batch);
    setTimeout(() => {
      const parentId = last(serverLog.current)?.id;
      serverLog.current.push(batch);
      const serverBatch: ServerBatch<PBT> = {
        batch,
        parentId,
      };
      setTimeout(() => {
        otherClient.handleUpdate(serverBatch);
      }, otherClient.syncDown);
    }, client.syncUp);
  }
};

export const App: FC = () => {
  const client1 = useClient();

  const client2 = useClient();

  const serverLog = useRef<Batch<PBT>[]>([]);

  useEffect(() => {
    handleEffect(client1, client2, serverLog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client1.uState.stateUpdates]);

  useEffect(() => {
    handleEffect(client2, client1, serverLog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client2.uState.stateUpdates]);

  return (
    <Row>
      <Playground client={client1} />
      <Playground client={client2} />
    </Row>
  );
};
