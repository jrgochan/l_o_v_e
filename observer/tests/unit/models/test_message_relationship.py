from uuid import uuid4

from app.models.message_relationship import MessageRelationship


def test_message_relationship_repr():
    """Test the __repr__ method of MessageRelationship."""
    source_id = uuid4()
    target_id = uuid4()
    rel = MessageRelationship(
        source_message_id=source_id,
        target_message_id=target_id,
        relationship_type="reply",
    )

    repr_str = repr(rel)
    assert str(source_id) in repr_str
    assert str(target_id) in repr_str
    assert "reply" in repr_str


def test_message_relationship_to_dict():
    """Test to_dict method."""
    rel = MessageRelationship(
        id=uuid4(),
        source_message_id=uuid4(),
        target_message_id=uuid4(),
        relationship_type="reply",
        relationship_metadata={"key": "val"},
    )
    # created_at is None until DB commit usually, but we can verify handling

    d = rel.to_dict()
    assert d["id"] == str(rel.id)
    assert d["relationship_metadata"] == {"key": "val"}
