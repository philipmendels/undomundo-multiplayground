import { FC, StrictMode, useEffect, useRef } from "react";
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

    // console.log(
    //   "make update",
    //   client.id,
    //   batch.id,
    //   client.log.current.map((batch) => batch.id.slice(0, 4)).join(", ")
    // );

    client.log.current.push(batch);

    const syncUp = () => {
      const parentId = last(serverLog.current)?.id;
      serverLog.current = [batch];

      const serverBatch: ServerBatch<PBT> = {
        batch,
        parentId,
      };

      // console.log("update on server", client.id, batch.id, parentId);

      if (otherClient.isDelayed) {
        setTimeout(() => {
          otherClient.handleUpdate(serverBatch);
        }, otherClient.syncDownTime * 1000);
      } else {
        otherClient.handleUpdate(serverBatch);
      }
    };

    if (client.isDelayed) {
      setTimeout(syncUp, client.syncUpTime * 1000);
    } else {
      syncUp();
    }
  }
};

export const App: FC = () => {
  const client1 = useClient("A");

  const client2 = useClient("B");

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
    <StrictMode>
      <Row>
        <Playground client={client1} />
        <Playground client={client2} />
      </Row>
    </StrictMode>
  );
};
