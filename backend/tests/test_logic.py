import pytest

def is_valid_move(x, y):
    # Verifying that coordinates reside within the specified boundary grid
    return 0 <= x <= 20 and 0 <= y <= 20

def test_coordinate_boundaries():
    # Evaluating edge configurations to confirm accurate spatial constraints
    assert is_valid_move(0, 0) is True      
    assert is_valid_move(20, 20) is True    
    assert is_valid_move(-1, 5) is False    
    assert is_valid_move(10, 21) is False