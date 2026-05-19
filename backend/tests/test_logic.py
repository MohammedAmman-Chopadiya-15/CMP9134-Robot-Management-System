import pytest

# A simple logic test to ensure our boundary-checking function works.
def is_valid_move(x, y):
    return 0 <= x <= 20 and 0 <= y <= 20

def test_coordinate_boundaries():
    assert is_valid_move(0, 0) is True      # Bottom-left limit
    assert is_valid_move(20, 20) is True    # Top-right limit
    assert is_valid_move(-1, 5) is False    # Out of bounds
    assert is_valid_move(10, 21) is False   # Out of bounds